"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

export async function approveRegistrationAction(
  studentId: string,
  teacherId?: string | null,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("approve_student", {
    p_student_id: studentId,
    p_teacher_id: teacherId || null,
    p_admin_id: session.user.id,
  });
  if (error) return { error: error.message };

  const { data: student } = await supabase
    .from("students")
    .select("full_name, registration_number")
    .eq("id", studentId)
    .maybeSingle();

  await notifyUser(supabase, {
    userId: studentId,
    title: "Registration approved",
    body: "Your ISKCON Disciples Course registration has been approved. You can now access your course dashboard.",
    type: "approval",
    link: "/student",
  });

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.ADMISSION_DECISION,
    entityType: "student",
    entityId: studentId,
    description: `Approved registration ${student?.registration_number ?? ""}`.trim(),
    metadata: { decision: "approved", teacher_id: teacherId ?? null },
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { ok: true, message: "Registration approved." };
}

export async function rejectRegistrationAction(
  studentId: string,
  remarks?: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("reject_student", { p_student_id: studentId });
  if (error) return { error: error.message };

  await notifyUser(supabase, {
    userId: studentId,
    title: "Registration not approved",
    body: remarks
      ? `Your registration was not approved. Reason: ${remarks}`
      : "Your registration was not approved. Please contact the IDC department for details.",
    type: "registration",
    link: "/student",
  });

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.ADMISSION_DECISION,
    entityType: "student",
    entityId: studentId,
    description: "Rejected registration",
    metadata: { decision: "rejected", remarks: remarks ?? null },
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
  return { ok: true, message: "Registration rejected." };
}

export async function assignTeacherAction(
  studentId: string,
  teacherId: string | null,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("assign_teacher", {
    p_student_id: studentId,
    p_teacher_id: teacherId,
    p_admin_id: session.user.id,
  });
  if (error) return { error: error.message };

  if (teacherId) {
    await notifyUser(supabase, {
      userId: studentId,
      title: "Teacher assigned",
      body: "A teacher has been assigned to guide you through the course.",
      type: "teacher",
      link: "/student",
    });
  }

  await recordAudit(supabase, {
    action: teacherId ? AUDIT_ACTIONS.TEACHER_ASSIGNED : AUDIT_ACTIONS.TEACHER_UNASSIGNED,
    entityType: "student",
    entityId: studentId,
    description: teacherId ? "Assigned a teacher" : "Removed the teacher assignment",
    metadata: { teacher_id: teacherId },
  });

  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  return { ok: true, message: "Teacher assignment updated." };
}