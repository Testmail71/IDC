import { IndianRupee, TrendingDown, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { DonutChart } from "@/components/charts/donut-chart";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, financeRes, paymentsRes] = await Promise.all([
    supabase.from("students").select("id, full_name, registration_number, status"),
    supabase.from("v_student_finance").select("*"),
    supabase.from("payment_transactions").select("method, amount, status"),
  ]);

  const finance = financeRes.data ?? [];
  const students = studentsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const totalPayable = finance.reduce((s, f) => s + Number(f.total_payable ?? 0), 0);
  const totalCollected = finance.reduce((s, f) => s + Number(f.net_paid ?? 0), 0);
  const totalOutstanding = finance.reduce((s, f) => s + Number(f.outstanding_due ?? 0), 0);
  const totalDiscounts = finance.reduce((s, f) => s + Number(f.discount_amount ?? 0), 0);
  const totalRefunds = finance.reduce((s, f) => s + Number(f.confirmed_refunds ?? 0), 0);
  const currency = finance[0]?.currency ?? "INR";

  const byStatus = (status: PaymentStatus) =>
    finance.filter((f) => f.payment_status === status).length;

  const collectionRate = totalPayable > 0 ? Math.round((totalCollected / totalPayable) * 100) : 0;

  const methodTotals = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "verified") continue;
    methodTotals.set(p.method, (methodTotals.get(p.method) ?? 0) + Number(p.amount));
  }
  const methodData = Array.from(methodTotals.entries())
    .map(([label, value]) => ({ label, value, tone: "saffron" as const }))
    .sort((a, b) => b.value - a.value);

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const csvRows = finance.map((f) => {
    const s = studentMap.get(f.student_id);
    return {
      "Registration No": s?.registration_number ?? "",
      Name: s?.full_name ?? "",
      Currency: f.currency,
      Payable: f.total_payable,
      "Net Paid": f.net_paid,
      Outstanding: f.outstanding_due,
      Discount: f.discount_amount,
      Refunds: f.confirmed_refunds,
      "Payment Status": f.payment_status,
      "Due Date": f.due_date ?? "",
      "Last Payment": f.last_payment_date ?? "",
    };
  });

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        description="Fee collection, outstanding balances and payment analysis."
        actions={
          <ExportCsvButton
            rows={csvRows}
            filename={`idc-finance-${new Date().toISOString().slice(0, 10)}.csv`}
            label="Export student finances"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total payable"
          value={formatCurrency(totalPayable, currency)}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard
          label="Total collected"
          value={formatCurrency(totalCollected, currency)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
          sub={`${collectionRate}% collection rate`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(totalOutstanding, currency)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone={totalOutstanding > 0 ? "red" : "green"}
        />
        <StatCard
          label="Discounts / Refunds"
          value={formatCurrency(totalDiscounts + totalRefunds, currency)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="gold"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collection by payment method</CardTitle>
          </CardHeader>
          <CardContent>
            {methodData.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">No verified payments yet.</p>
            ) : (
              <SimpleBarChart data={methodData} formatValue={(v) => formatCurrency(v, currency)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              centerLabel="Students"
              centerValue={String(finance.length)}
              segments={[
                { label: "Paid", value: byStatus("paid") + byStatus("overpaid"), color: "#10b981" },
                { label: "Partial", value: byStatus("partially_paid"), color: "#f59e0b" },
                { label: "Unpaid", value: byStatus("unpaid"), color: "#ef4444" },
                { label: "Waived", value: byStatus("waived"), color: "#eab308" },
                { label: "Refunded", value: byStatus("refunded"), color: "#a8a29e" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={students.length} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Approved"
          value={students.filter((s) => s.status === "approved").length}
          tone="maroon"
        />
        <StatCard
          label="Pending"
          value={students.filter((s) => s.status === "pending").length}
          tone="gold"
        />
      </div>
    </div>
  );
}