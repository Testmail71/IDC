"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireStudent } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateStudentProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStudent();
  const supabase = await createClient();

  const parsed = profileUpdateSchema.safeParse({
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    pincode: String(formData.get("pincode") ?? "").trim(),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;

  const { error } = await supabase
    .from("students")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      whatsapp: input.whatsapp || null,
      address: input.address,
      city: input.city,
      district: input.district,
      state: input.state,
      pincode: input.pincode,
    })
    .eq("id", session.user.id);

  if (error) return { error: error.message };

  await supabase
    .from("profiles")
    .update({ full_name: input.full_name, phone: input.phone })
    .eq("id", session.user.id);

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PROFILE_UPDATED,
    entityType: "student",
    entityId: session.user.id,
    description: "Student updated their contact details",
  });

  revalidatePath("/student/profile");
  revalidatePath("/student");
  return { ok: true, message: "Your profile has been updated." };
}

export async function setStudentPhotoPathAction(path: string): Promise<ActionResult> {
  const session = await requireStudent();
  const supabase = await createClient();

  // Never trust an arbitrary path: it must live under the user's own folder.
  if (!path.startsWith(`${session.user.id}/`)) {
    return { error: "Invalid photo path." };
  }

  const { error } = await supabase
    .from("students")
    .update({ photo_path: path })
    .eq("id", session.user.id);

  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PROFILE_UPDATED,
    entityType: "student",
    entityId: session.user.id,
    description: "Student updated their photograph",
  });

  revalidatePath("/student/profile");
  return { ok: true, message: "Photo updated." };
}