import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileCheck2,
  IndianRupee,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RegistrationStatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RegistrationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, financeRes, examsRes, pendingRes, auditRes] = await Promise.all([
    supabase.from("students").select("id, status"),
    supabase.from("v_student_finance").select("total_payable, net_paid, outstanding_due, payment_status"),
    supabase
      .from("examination_submissions")
      .select("id, status, is_active")
      .in("status", ["submitted", "under_evaluation"]),
    supabase
      .from("students")
      .select("id, full_name, registration_number, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("audit_logs")
      .select("id, action, description, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const students = studentsRes.data ?? [];
  const finance = financeRes.data ?? [];
  const pendingExams = (examsRes.data ?? []).filter((e) => e.is_active).length;

  const totalReceived = finance.reduce((s, f) => s + Number(f.net_paid ?? 0), 0);
  const totalOutstanding = finance.reduce((s, f) => s + Number(f.outstanding_due ?? 0), 0);
  const approved = students.filter((s) => s.status === "approved").length;
  const pending = students.filter((s) => s.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Administrator Dashboard"
        description="Overview of registrations, students, finances and examinations."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total students"
          value={students.length}
          icon={<Users className="h-5 w-5" />}
          sub={`${approved} approved`}
        />
        <StatCard
          label="Pending registrations"
          value={pending}
          icon={<ClipboardList className="h-5 w-5" />}
          tone={pending > 0 ? "gold" : "stone"}
        />
        <StatCard
          label="Exams awaiting action"
          value={pendingExams}
          icon={<FileCheck2 className="h-5 w-5" />}
          tone={pendingExams > 0 ? "saffron" : "stone"}
        />
        <StatCard
          label="Fees collected"
          value={formatCurrency(totalReceived)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="green"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Outstanding dues"
          value={formatCurrency(totalOutstanding)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone={totalOutstanding > 0 ? "red" : "green"}
        />
        <StatCard
          label="Paid students"
          value={finance.filter((f) => f.payment_status === "paid" || f.payment_status === "overpaid").length}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Approved students"
          value={approved}
          icon={<UserCheck className="h-5 w-5" />}
          tone="maroon"
        />
        <StatCard
          label="Total assessed"
          value={formatCurrency(finance.reduce((s, f) => s + Number(f.total_payable ?? 0), 0))}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="gold"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pending registrations</CardTitle>
            <Link
              href="/admin/registrations"
              className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
            >
              Review <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {(pendingRes.data ?? []).length === 0 ? (
              <EmptyState title="No pending registrations" description="All registrations have been processed." />
            ) : (
              <div className="p-5 pt-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Name</TH>
                      <TH>Reg. No.</TH>
                      <TH>Applied</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {(pendingRes.data ?? []).map((s) => (
                      <TR key={s.id}>
                        <TD className="font-medium text-stone-900">{s.full_name}</TD>
                        <TD>{s.registration_number}</TD>
                        <TD>{formatDate(s.created_at)}</TD>
                        <TD>
                          <RegistrationStatusBadge status={s.status as RegistrationStatus} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(auditRes.data ?? []).length === 0 ? (
              <EmptyState title="No recent activity" />
            ) : (
              <ul className="space-y-3">
                {(auditRes.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron-400" />
                    <div className="min-w-0">
                      <p className="text-stone-700">{a.description ?? a.action}</p>
                      <p className="text-xs text-stone-400">{formatDate(a.created_at, true)}</p>
                    </div>
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