import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TeachersManager, type TeacherRow } from "@/components/admin/teachers-manager";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminTeachersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [teachersRes, assignmentsRes] = await Promise.all([
    supabase.from("teachers").select("*").order("full_name"),
    supabase.from("teacher_assignments").select("teacher_id").eq("is_active", true),
  ]);

  const counts = new Map<string, number>();
  for (const a of assignmentsRes.data ?? []) {
    counts.set(a.teacher_id, (counts.get(a.teacher_id) ?? 0) + 1);
  }

  const teachers: TeacherRow[] = (teachersRes.data ?? []).map((t) => ({
    id: t.id,
    full_name: t.full_name,
    email: t.email,
    phone: t.phone,
    is_active: t.is_active,
    can_view_finance: t.can_view_finance,
    can_publish_results: t.can_publish_results,
    can_issue_certificates: t.can_issue_certificates,
    remarks: t.remarks,
    studentCount: counts.get(t.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Create teacher accounts and manage their permissions and student assignments."
      />
      <Card>
        <CardContent className="p-5">
          <TeachersManager teachers={teachers} />
        </CardContent>
      </Card>
    </div>
  );
}