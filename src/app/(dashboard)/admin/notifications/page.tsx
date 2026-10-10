import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, auditRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, registration_number")
      .eq("status", "approved")
      .order("full_name"),
    supabase
      .from("audit_logs")
      .select("id, description, created_at")
      .eq("action", "notification.created")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Send in-portal notifications to students or teachers."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New notification</CardTitle>
          </CardHeader>
          <CardContent>
            <BroadcastForm students={studentsRes.data ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently sent</CardTitle>
          </CardHeader>
          <CardContent>
            {(auditRes.data ?? []).length === 0 ? (
              <p className="text-sm text-stone-400">No broadcasts yet.</p>
            ) : (
              <ul className="space-y-3">
                {(auditRes.data ?? []).map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="text-stone-700">{a.description}</p>
                    <p className="text-xs text-stone-400">{formatDate(a.created_at, true)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}