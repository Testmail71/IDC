"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { certificateSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/constants";
import { removeFile } from "@/lib/storage";
import type { ActionResult } from "@/actions/student";

/** Register a certificate that has already been uploaded to storage. */
export async function issueCertificateAction(input: {
  studentId: string;
  filePath: string;
  fileName?: string;
  issueDate: string;
  certificateNumber?: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  if (!input.filePath.startsWith(`${input.studentId}/`)) {
    return { error: "Invalid certificate path." };
  }

  let certificateNumber = input.certificateNumber?.trim();
  if (!certificateNumber) {
    const { data: generated, error } = await supabase.rpc("next_certificate_number", {
      p_year: new Date().getFullYear(),
    });
    if (error || !generated) {
      return { error: error?.message ?? "Could not allocate a certificate number." };
    }
    certificateNumber = generated as string;
  }

  const parsed = certificateSchema.safeParse({
    certificate_number: certificateNumber,
    issue_date: input.issueDate,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid certificate details." };
  }

  const { data: existing } = await supabase
    .from("certificates")
    .select("id, version")
    .eq("student_id", input.studentId)
    .eq("is_active", true)
    .maybeSingle();

  let version = 1;
  if (existing) {
    version = (existing.version ?? 1) + 1;
    await supabase
      .from("certificates")
      .update({ is_active: false })
      .eq("id", existing.id);
  }

  const { data: inserted, error } = await supabase
    .from("certificates")
    .insert({
      student_id: input.studentId,
      certificate_number: parsed.data.certificate_number,
      file_path: input.filePath,
      issue_date: parsed.data.issue_date,
      status: "draft",
      version,
      uploaded_by: session.user.id,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) {
    await removeFile(supabase, BUCKETS.certificates, input.filePath);
    return { error: error.message };
  }

  await supabase.from("certificate_history").insert({
    certificate_id: inserted.id,
    student_id: input.studentId,
    file_path: input.filePath,
    version,
    action: "uploaded",
    performed_by: session.user.id,
  });

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.CERTIFICATE_UPLOADED,
    entityType: "certificate",
    entityId: inserted.id,
    description: `Issued certificate ${parsed.data.certificate_number} (draft, v${version})`,
  });

  revalidatePath("/admin/certificates");
  return { ok: true, message: `Certificate ${parsed.data.certificate_number} saved as draft.` };
}

export async function publishCertificateAction(
  certificateId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { data: certificate } = await supabase
    .from("certificates")
    .select("student_id, certificate_number, file_path, version")
    .eq("id", certificateId)
    .maybeSingle();
  if (!certificate) return { error: "Certificate not found." };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", certificateId);
  if (error) return { error: error.message };

  await supabase.from("certificate_history").insert({
    certificate_id: certificateId,
    student_id: certificate.student_id,
    file_path: certificate.file_path,
    version: certificate.version,
    action: "published",
    performed_by: session.user.id,
  });

  await notifyUser(supabase, {
    userId: certificate.student_id,
    title: "Certificate published",
    body: `Your IDC certificate (${certificate.certificate_number}) is now available for download.`,
    type: "certificate",
    link: "/student/certificate",
  });

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.CERTIFICATE_PUBLISHED,
    entityType: "certificate",
    entityId: certificateId,
    description: `Published certificate ${certificate.certificate_number}`,
  });

  revalidatePath("/admin/certificates");
  revalidatePath("/student/certificate");
  return { ok: true, message: "Certificate published." };
}

export async function revokeCertificateAction(
  certificateId: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  if (!reason || reason.trim().length < 3) {
    return { error: "Provide a reason for revoking the certificate." };
  }

  const { data: certificate } = await supabase
    .from("certificates")
    .select("student_id, certificate_number, file_path, version")
    .eq("id", certificateId)
    .maybeSingle();
  if (!certificate) return { error: "Certificate not found." };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoke_reason: reason.trim(),
      is_active: false,
    })
    .eq("id", certificateId);
  if (error) return { error: error.message };

  await supabase.from("certificate_history").insert({
    certificate_id: certificateId,
    student_id: certificate.student_id,
    file_path: certificate.file_path,
    version: certificate.version,
    action: "revoked",
    performed_by: session.user.id,
  });

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.CERTIFICATE_REVOKED,
    entityType: "certificate",
    entityId: certificateId,
    description: `Revoked certificate ${certificate.certificate_number}`,
    metadata: { reason: reason.trim() },
  });

  revalidatePath("/admin/certificates");
  return { ok: true, message: "Certificate revoked." };
}