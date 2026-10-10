import { PageHeader } from "@/components/ui/page-header";
import { NotificationList } from "@/components/notifications/notification-list";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";

export async function NotificationsPageContent() {
  const session = await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your course, payments, examinations and certificates."
      />
      <NotificationList notifications={(data as Notification[]) ?? []} />
    </div>
  );
}