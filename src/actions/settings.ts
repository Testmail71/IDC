"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

const ALLOWED_SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

export async function updateSettingsAction(
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const rows = Object.entries(values)
    .filter(([key]) => ALLOWED_SETTING_KEYS.has(key))
    .map(([key, value]) => ({
      key: key as SettingKey,
      value,
      updated_by: session.user.id,
    }));

  if (rows.length === 0) {
    return { error: "No valid settings to save." };
  }

  const { error } = await supabase
    .from("portal_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.SETTING_UPDATED,
    entityType: "portal_settings",
    description: `Updated settings: ${rows.map((r) => r.key).join(", ")}`,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true, message: "Settings saved." };
}

export async function saveLogoAction(path: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  if (!path) return { error: "No logo path provided." };

  const { error } = await supabase
    .from("portal_settings")
    .upsert(
      { key: "logo_path", value: path, updated_by: session.user.id },
      { onConflict: "key" },
    );
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.SETTING_UPDATED,
    entityType: "portal_settings",
    description: "Updated the portal logo",
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true, message: "Logo updated." };
}

/**
 * Broadcast an in-portal notification to a group of users.
 * Audience: all approved students, a specific student, or all teachers.
 */
export async function broadcastNotificationAction(input: {
  audience: "all_students" | "all_teachers" | "student";
  studentId?: string;
  title: string;
  body: string;
  link?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const title = input.title?.trim();
  const body = input.body?.trim();
  if (!title || title.length < 3) return { error: "Enter a notification title." };
  if (!body || body.length < 3) return { error: "Enter the notification message." };

  let userIds: string[] = [];

  if (input.audience === "student") {
    if (!input.studentId) return { error: "Select a student." };
    userIds = [input.studentId];
  } else if (input.audience === "all_teachers") {
    const { data } = await supabase.from("teachers").select("id").eq("is_active", true);
    userIds = (data ?? []).map((t) => t.id);
  } else {
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("status", "approved");
    userIds = (data ?? []).map((s) => s.id);
  }

  if (userIds.length === 0) {
    return { error: "No recipients matched this audience." };
  }

  const link = input.link?.trim() || null;
  for (const userId of userIds) {
    await notifyUser(supabase, {
      userId,
      title,
      body,
      type: "general",
      link,
    });
  }

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.NOTIFICATION_CREATED,
    entityType: "notification",
    description: `Broadcast "${title}" to ${userIds.length} ${input.audience}`,
    metadata: { audience: input.audience, count: userIds.length },
  });

  revalidatePath("/admin/notifications");
  return { ok: true, message: `Notification sent to ${userIds.length} recipient(s).` };
}