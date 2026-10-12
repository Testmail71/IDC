"use server";

import { revalidatePath, updateTag } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { teacherSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

export async function createTeacherAction(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  canViewFinance?: boolean;
  canPublishResults?: boolean;
  canIssueCertificates?: boolean;
  remarks?: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = teacherSchema.safeParse({
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? "",
    can_view_finance: input.canViewFinance,
    can_publish_results: input.canPublishResults,
    can_issue_certificates: input.canIssueCertificates,
    remarks: input.remarks ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid teacher details." };
  }
  if (!input.password || input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (existingProfile) {
    return { error: "An account with this email already exists." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, role: "teacher" },
  });
  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the teacher account." };
  }

  const userId = created.user.id;

  try {
    const { error } = await admin.from("teachers").insert({
      id: userId,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      can_view_finance: Boolean(parsed.data.can_view_finance),
      can_publish_results: Boolean(parsed.data.can_publish_results),
      can_issue_certificates: Boolean(parsed.data.can_issue_certificates),
      remarks: parsed.data.remarks || null,
      is_active: true,
    });
    if (error) throw new Error(error.message);

    await recordAudit(admin, {
      action: AUDIT_ACTIONS.TEACHER_CREATED,
      entityType: "teacher",
      entityId: userId,
      description: `Created teacher account for ${parsed.data.full_name}`,
      metadata: { email: parsed.data.email, created_by: session.user.id },
    });

    revalidatePath("/admin/teachers");
    updateTag("teachers");
    revalidatePath("/register");
    return { ok: true, message: "Teacher account created." };
  } catch (error) {
    await admin.auth.admin.deleteUser(userId);
    return { error: error instanceof Error ? error.message : "Could not create the teacher." };
  }
}

export async function updateTeacherAction(input: {
  teacherId: string;
  fullName: string;
  phone?: string;
  canViewFinance?: boolean;
  canPublishResults?: boolean;
  canIssueCertificates?: boolean;
  isActive?: boolean;
  remarks?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = teacherSchema.safeParse({
    full_name: input.fullName,
    email: `${input.teacherId}@placeholder.local`,
    phone: input.phone ?? "",
    can_view_finance: input.canViewFinance,
    can_publish_results: input.canPublishResults,
    can_issue_certificates: input.canIssueCertificates,
    is_active: input.isActive,
    remarks: input.remarks ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid teacher details." };
  }

  const { error } = await supabase
    .from("teachers")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      can_view_finance: Boolean(parsed.data.can_view_finance),
      can_publish_results: Boolean(parsed.data.can_publish_results),
      can_issue_certificates: Boolean(parsed.data.can_issue_certificates),
      is_active: input.isActive ?? true,
      remarks: parsed.data.remarks || null,
    })
    .eq("id", input.teacherId);

  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.TEACHER_UPDATED,
    entityType: "teacher",
    entityId: input.teacherId,
    description: "Updated teacher permissions/details",
  });

  revalidatePath("/admin/teachers");
  updateTag("teachers");
  revalidatePath("/register");
  return { ok: true, message: "Teacher updated." };
}