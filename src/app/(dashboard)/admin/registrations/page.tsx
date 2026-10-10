import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { RegistrationsTable, type PendingRegistration } from "@/components/admin/registrations-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [pendingRes, teachersRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, registration_number, email, phone, gender, city, state, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("teachers").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const registrations = (pendingRes.data ?? []) as PendingRegistration[];

  return (
    <div>
      <PageHeader
        title="Registrations"
        description="Review new applications. Approving a registration enrols the student and snapshots the current fee."
      />
      <Card>
        <CardContent className="p-5">
          {registrations.length === 0 ? (
            <EmptyState
              title="No pending registrations"
              description="New applications will appear here for approval."
            />
          ) : (
            <RegistrationsTable registrations={registrations} teachers={teachersRes.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}