"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { evaluationSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

/** Save an evaluation as a draft (not yet visible to the student). */
export async function saveEvaluationAction(input: {
  submissionId: string;
  result: "qualified" | "not_qualified";
  internalRemarks?: string;
  studentFeedback?: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const parsed = evaluationSchema.safeParse({
    result: input.result,
    internal_remarks: input.internalRemarks ?? "",
    student_feedback: input.studentFeedback ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid evaluation." };
  }

  const { error } = await supabase.from("examination_evaluations").upsert(
    {
      submission_id: input.submissionId,
      evaluator_id: session.user.id,
      result: parsed.data.result,
      internal_remarks: parsed.data.internal_remarks || null,
      student_feedback: parsed.data.student_feedback || null,
      evaluated_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" },
  );
  if (error) return { error: error.message };

  await supabase
    .from("examination_submissions")
    .update({ status: "under_evaluation" })
    .eq("id", input.submissionId)
    .eq("status", "submitted");

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.EXAM_EVALUATED,
    entityType: "examination_submission",
    entityId: input.submissionId,
    description: `Saved evaluation (${parsed.data.result})`,
  });

  revalidatePath("/admin/exams");
  return { ok: true, message: "Evaluation saved (not published yet)." };
}

/** Publish the result so the student can see it. */
export async function publishResultAction(
  submissionId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { data: evaluation } = await supabase
    .from("examination_evaluations")
    .select("result")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (!evaluation?.result) {
    return { error: "Save an evaluation result before publishing." };
  }

  const { error } = await supabase
    .from("examination_evaluations")
    .update({
      published: true,
      published_at: new Date().toISOString(),
      published_by: session.user.id,
    })
    .eq("submission_id", submissionId);
  if (error) return { error: error.message };

  await supabase
    .from("examination_submissions")
    .update({ status: evaluation.result })
    .eq("id", submissionId);

  const { data: submission } = await supabase
    .from("examination_submissions")
    .select("student_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (submission) {
    const qualified = evaluation.result === "qualified";
    await notifyUser(supabase, {
      userId: submission.student_id,
      title: qualified ? "Examination result: Qualified" : "Examination result: Not qualified",
      body: qualified
        ? "Congratulations! You have qualified the IDC examination. Your certificate will be issued shortly."
        : "Your examination result has been published. Please view the feedback in your examination page.",
      type: "result",
      link: "/student/exam",
    });
  }

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.EXAM_RESULT_PUBLISHED,
    entityType: "examination_submission",
    entityId: submissionId,
    description: `Published result (${evaluation.result})`,
  });

  revalidatePath("/admin/exams");
  revalidatePath("/student/exam");
  return { ok: true, message: "Result published to the student." };
}

/** Request a resubmission without failing the student. */
export async function requestResubmissionAction(input: {
  submissionId: string;
  feedback: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const feedback = input.feedback?.trim();
  if (!feedback || feedback.length < 5) {
    return { error: "Provide feedback explaining what needs to be resubmitted." };
  }

  const { error } = await supabase
    .from("examination_submissions")
    .update({ status: "resubmission_requested" })
    .eq("id", input.submissionId);
  if (error) return { error: error.message };

  await supabase.from("examination_evaluations").upsert(
    {
      submission_id: input.submissionId,
      evaluator_id: session.user.id,
      student_feedback: feedback,
      internal_remarks: null,
    },
    { onConflict: "submission_id" },
  );

  const { data: submission } = await supabase
    .from("examination_submissions")
    .select("student_id")
    .eq("id", input.submissionId)
    .maybeSingle();

  if (submission) {
    await notifyUser(supabase, {
      userId: submission.student_id,
      title: "Resubmission requested",
      body: feedback,
      type: "exam",
      link: "/student/exam",
    });
  }

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.EXAM_EVALUATED,
    entityType: "examination_submission",
    entityId: input.submissionId,
    description: "Requested examination resubmission",
  });

  revalidatePath("/admin/exams");
  return { ok: true, message: "Resubmission requested." };
}