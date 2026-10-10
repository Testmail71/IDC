import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditInput {
  action: string;
  entityType?: string;
  entityId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append a row to the audit log. Uses the provided (server) client so the
 * caller's identity is recorded from their session. Insert is permitted by
 * RLS for authenticated users; reads are restricted to administrators.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  input: AuditInput,
): Promise<void> {
  let actorId: string | null = null;
  let actorRole: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    actorId = user?.id ?? null;
    if (actorId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", actorId)
        .maybeSingle();
      actorRole = profile?.role ?? null;
    }
  } catch {
    // Non-fatal: audit rows can still be written without actor context.
  }

  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_role: actorRole,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    description: input.description ?? null,
    metadata: input.metadata ?? null,
  });
}

export const AUDIT_ACTIONS = {
  REGISTERED: "student.registered",
  ADMISSION_DECISION: "student.admission_decision",
  PROFILE_UPDATED: "student.profile_updated",
  TEACHER_CREATED: "teacher.created",
  TEACHER_UPDATED: "teacher.updated",
  TEACHER_ASSIGNED: "teacher.assigned",
  TEACHER_UNASSIGNED: "teacher.unassigned",
  PROGRESS_UPDATED: "course.progress_updated",
  COURSE_REQUIREMENTS: "course.requirements_updated",
  FEE_SETTINGS_UPDATED: "fee.settings_updated",
  FEE_ASSESSMENT_UPDATED: "fee.assessment_updated",
  PAYMENT_RECORDED: "payment.recorded",
  PAYMENT_VERIFIED: "payment.verified",
  PAYMENT_REJECTED: "payment.rejected",
  PAYMENT_REVERTED: "payment.reverted",
  REFUND_RECORDED: "refund.recorded",
  REFUND_CONFIRMED: "refund.confirmed",
  RECEIPT_ISSUED: "receipt.issued",
  EXAM_SUBMITTED: "exam.submitted",
  EXAM_RESUBMITTED: "exam.resubmitted",
  EXAM_EVALUATED: "exam.evaluated",
  EXAM_RESULT_PUBLISHED: "exam.result_published",
  CERTIFICATE_UPLOADED: "certificate.uploaded",
  CERTIFICATE_PUBLISHED: "certificate.published",
  CERTIFICATE_REVOKED: "certificate.revoked",
  CERTIFICATE_REPLACED: "certificate.replaced",
  MATERIAL_UPLOADED: "material.uploaded",
  MATERIAL_UPDATED: "material.updated",
  MATERIAL_DELETED: "material.deleted",
  NOTIFICATION_CREATED: "notification.created",
  SETTING_UPDATED: "setting.updated",
} as const;