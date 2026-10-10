import { IndianRupee, Users, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { DuesTable, type DueRow } from "@/components/admin/dues-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDuesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, financeRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, registration_number, phone, whatsapp, status")
      .eq("status", "approved"),
    supabase
      .from("v_student_finance")
      .select("student_id, outstanding_due, currency, payment_status, due_date, last_payment_date"),
  ]);

  const financeByStudent = new Map((financeRes.data ?? []).map((f) => [f.student_id, f]));

  const rows: DueRow[] = (studentsRes.data ?? [])
    .map((s) => {
      const finance = financeByStudent.get(s.id);
      return {
        studentId: s.id,
        fullName: s.full_name,
        registrationNumber: s.registration_number,
        phone: s.phone,
        whatsapp: s.whatsapp,
        outstanding: Number(finance?.outstanding_due ?? 0),
        currency: finance?.currency ?? "INR",
        paymentStatus: (finance?.payment_status as PaymentStatus) ?? "unpaid",
        dueDate: finance?.due_date ?? null,
        lastPaymentDate: finance?.last_payment_date ?? null,
      };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalDue = rows.reduce((sum, r) => sum + r.outstanding, 0);
  const currency = rows[0]?.currency ?? "INR";
  const fullyUnpaid = rows.filter((r) => r.paymentStatus === "unpaid").length;

  return (
    <div>
      <PageHeader
        title="Payment Due Management"
        description="Track outstanding balances and send payment reminders via the portal or WhatsApp."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Students with dues"
          value={rows.length}
          icon={<Users className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label="Total outstanding"
          value={formatCurrency(totalDue, currency)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Fully unpaid"
          value={fullyUnpaid}
          icon={<Wallet className="h-5 w-5" />}
          tone="maroon"
        />
      </div>

      <Card>
        <CardContent className="p-5">
          {rows.length === 0 ? (
            <EmptyState
              title="No outstanding dues"
              description="All approved students have settled their fees."
            />
          ) : (
            <DuesTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}