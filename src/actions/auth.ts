"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dashboardPathForRole } from "@/lib/constants";
import { changePasswordSchema } from "@/lib/validations";
import type { ActionResult } from "@/actions/student";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signInAction(
  _prevState: { error?: string } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const targetRedirect = String(formData.get("redirect") ?? "").trim();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unable to load your account." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Unable to load your profile. Please contact the administrator." };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Your account has been disabled. Please contact the administrator." };
  }

  if (
    targetRedirect &&
    targetRedirect.startsWith("/") &&
    !targetRedirect.startsWith("//") &&
    !targetRedirect.startsWith("/login")
  ) {
    const isSuperOrAdmin = profile.role === "admin" || profile.role === "super_admin";
    const allowedPrefix = isSuperOrAdmin ? "/admin" : `/${profile.role}`;
    if (
      targetRedirect === allowedPrefix ||
      targetRedirect.startsWith(`${allowedPrefix}/`) ||
      targetRedirect === "/dashboard"
    ) {
      redirect(targetRedirect);
    }
  }

  redirect(dashboardPathForRole(profile.role));
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You are not signed in." };

  const parsed = changePasswordSchema.safeParse({
    current_password: String(formData.get("current_password") ?? ""),
    new_password: String(formData.get("new_password") ?? ""),
    confirm_password: String(formData.get("confirm_password") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (authError) {
    return { fieldErrors: { current_password: "Your current password is incorrect." } };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (error) return { error: error.message };

  return { ok: true, message: "Your password has been changed successfully." };
}