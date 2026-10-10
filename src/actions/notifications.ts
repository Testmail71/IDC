"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { markAllRead, markNotificationRead } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(id: string) {
  await requireAuth();
  const supabase = await createClient();
  await markNotificationRead(supabase, id);
  revalidatePath("/student/notifications");
  revalidatePath("/teacher/notifications");
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsReadAction() {
  const session = await requireAuth();
  const supabase = await createClient();
  await markAllRead(supabase, session.user.id);
  revalidatePath("/student/notifications");
  revalidatePath("/teacher/notifications");
  revalidatePath("/admin/notifications");
}