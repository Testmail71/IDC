import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "registration"
  | "approval"
  | "teacher"
  | "progress"
  | "exam"
  | "result"
  | "certificate"
  | "payment"
  | "receipt"
  | "dues"
  | "reminder"
  | "general";

/**
 * Create an in-portal notification for a user. Insert is allowed by RLS.
 */
export async function notifyUser(
  supabase: SupabaseClient,
  input: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    link?: string | null;
  },
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    link: input.link ?? null,
    is_read: false,
  });
}

/** Mark one notification as read. Caller identity is enforced by RLS. */
export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

export async function markAllRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}