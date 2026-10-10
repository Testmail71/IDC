import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { RefundsTable, type RefundRow } from "@/components/admin/refunds-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: refunds } = await supabase
    .from("payment_refunds")
    .select("*")
    .order("created_at", { ascending: false });

  const studentIds = Array.from(new Set((refunds ?? []).map((r) => r.student_id)));
  const paymentIds = Array.from(new Set((refunds ?? []).map((r) => r.payment_id)));

  const [studentsRes, paymentsRes] = await Promise.all([
    studentIds.length
      ? supabase.from("students").select("id, full_name").in("id", studentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    paymentIds.length
      ? supabase.from("payment_transactions").select("id, receipt_number, currency").in("id", paymentIds)
      : Promise.resolve({ data: [] as { id: string; receipt_number: string; currency: string }[] }),
  ]);

  const studentName = new Map((studentsRes.data ?? []).map((s) => [s.id, s.full_name]));
  const paymentInfo = new Map((paymentsRes.data ?? []).map((p) => [p.id, p]));

  const rows: RefundRow[] = (refunds ?? []).map((r) => {
    const payment = paymentInfo.get(r.payment_id);
    return {
      id: r.id,
      studentId: r.student_id,
      studentName: studentName.get(r.student_id) ?? "Unknown",
      paymentId: r.payment_id,
      receiptNumber: payment?.receipt_number ?? "—",
      amount: Number(r.amount),
      currency: payment?.currency ?? "INR",
      refundDate: r.refund_date,
      method: r.method,
      reason: r.reason,
      status: r.status as "pending" | "confirmed" | "cancelled",
    };
  });

  const openRefunds = rows.filter((r) => r.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Recorded refunds. Confirming a refund adjusts the student's outstanding balance."
      />
      <Card>
        <CardContent className="p-5">
          {openRefunds > 0 && (
            <p className="mb-4 text-sm text-amber-700">
              {openRefunds} refund(s) awaiting confirmation.
            </p>
          )}
          {rows.length === 0 ? (
            <EmptyState
              title="No refunds"
              description="Refunds recorded against verified payments will appear here."
            />
          ) : (
            <RefundsTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}