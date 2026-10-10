"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { progressSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

/**
 * Update class-completion progress for a student's active enrollment.
 * Permitted for admins and for the student's assigned teacher (enforced by RLS).
 */
export async function updateProgressAction(input: {
  enrollmentId: string;
  classesCompleted: number;
  status: "not_started" | "in_progress" | "completed";
  completionDate?: string;
  adminRemarks?: string;
  examExceptionAllowed?: boolean;
}): Promise<ActionResult> {
  await requireRole(["teacher", "admin", "super_admin"]);
  const supabase = await createClient();

  const parsed = progressSchema.safeParse({
    classes_completed: input.classesCompleted,
    status: input.status,
    completion_date: input.completionDate ?? "",
    admin_remarks: input.adminRemarks ?? "",
    exam_exception_allowed: input.examExceptionAllowed,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid progress update." };
  }

  const patch: Record<string, unknown> = {
    classes_completed: parsed.data.classes_completed,
    status: parsed.data.status,
    completion_date: parsed.data.completion_date || null,
    admin_remarks: parsed.data.admin_remarks || null,
  };
  if (typeof parsed.data.exam_exception_allowed === "boolean") {
    patch.exam_exception_allowed = parsed.data.exam_exception_allowed;
  }

  const { error } = await supabase
    .from("course_progress")
    .update(patch)
    .eq("enrollment_id", input.enrollmentId);

  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PROGRESS_UPDATED,
    entityType: "course_progress",
    entityId: input.enrollmentId,
    description: `Progress updated to ${parsed.data.classes_completed} classes (${parsed.data.status})`,
  });

  revalidatePath("/teacher/students");
  revalidatePath("/admin/progress");
  revalidatePath("/admin/students");
  return { ok: true, message: "Course progress saved." };
}