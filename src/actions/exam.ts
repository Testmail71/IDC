"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireStudent } from "@/lib/auth";
import { examSubmissionSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

export async function submitExamAction(input: {
  path: string;
  fileName: string;
  examinationDate: string;
  remarks?: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  const supabase = await createClient();

  if (!input.path.startsWith(`${session.user.id}/`)) {
    return { error: "Invalid file path." };
  }

  const parsed = examSubmissionSchema.safeParse({
    examination_date: input.examinationDate,
    remarks: input.remarks ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }

  const { data: existing } = await supabase
    .from("examination_submissions")
    .select("id")
    .eq("student_id", session.user.id)
    .eq("is_active", true)
    .maybeSingle();

  // Retire any previous active submission first (resubmission / replacement).
  if (existing) {
    await supabase
      .from("examination_submissions")
      .update({ is_active: false })
      .eq("id", existing.id);
  }

  const { error } = await supabase.from("examination_submissions").insert({
    student_id: session.user.id,
    examination_date: parsed.data.examination_date,
    file_path: input.path,
    file_name: input.fileName,
    remarks: parsed.data.remarks || null,
    status: "submitted",
    is_active: true,
  });

  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: existing ? AUDIT_ACTIONS.EXAM_RESUBMITTED : AUDIT_ACTIONS.EXAM_SUBMITTED,
    entityType: "examination_submission",
    entityId: session.user.id,
    description: existing ? "Student resubmitted the examination sheet" : "Student submitted the examination sheet",
  });

  revalidatePath("/student/exam");
  revalidatePath("/student");
  return { ok: true, message: "Your examination sheet has been submitted." };
}