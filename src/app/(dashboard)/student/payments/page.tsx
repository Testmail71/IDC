import { Download, IndianRupee } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentStatusBadge, TxnStatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireStudent } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStudentFinance } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type PaymentStatusTxn } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentPaymentsPage() {
  const session = await requireStudent();
  const supabase = await createClient();

  const [finance, txnsRes] = await Promise.all([
    getStudentFinance(supabase, session.user.id),
    supabase
      .from("payment_transactions")
      .select("*")
      .eq("student_id", session.user.id)
      .order("payment_date", { ascending: false }),
  ]);

  const transactions = txnsRes.data ?? [];
  const currency = finance?.currency ?? "INR";

  return (
    <div>
      <PageHeader
        title="My Payments"
        description="Your fee assessment, payments made and outstanding balance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total fee"
          value={formatCurrency(finance?.total_payable ?? 0, currency)}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard
          label="Total paid"
          value={formatCurrency(finance?.net_paid ?? 0, currency)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(finance?.outstanding_due ?? 0, currency)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone={(finance?.outstanding_due ?? 0) > 0 ? "red" : "green"}
        />
        <StatCard
          label="Status"
          value={finance ? <PaymentStatusBadge status={finance.payment_status} /> : "—"}
          tone="gold"
          sub={finance?.due_date ? `Due by ${formatDate(finance.due_date)}` : undefined}
        />
      </div>

      {finance && finance.outstanding_due > 0 && (
        <div className="mt-6">
          <Alert variant="warning" title="Payment due">
            You have an outstanding balance of {formatCurrency(finance.outstanding_due, currency)}.
            Please pay at the temple office (cash / UPI / bank transfer) and collect your receipt.
          </Alert>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <EmptyState
              title="No payments recorded yet"
              description="Once the administrator records your payment, it will appear here with a downloadable receipt."
            />
          ) : (
            <div className="p-5 pt-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Receipt No.</TH>
                    <TH>Date</TH>
                    <TH>Method</TH>
                    <TH className="text-right">Amount</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Receipt</TH>
                  </TR>
                </THead>
                <TBody>
                  {transactions.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-medium text-stone-900">{t.receipt_number}</TD>
                      <TD>{formatDate(t.payment_date)}</TD>
                      <TD>{PAYMENT_METHOD_LABELS[t.method as PaymentMethod] ?? t.method}</TD>
                      <TD className="text-right font-medium">{formatCurrency(t.amount, currency)}</TD>
                      <TD>
                        <TxnStatusBadge status={t.status as PaymentStatusTxn} />
                      </TD>
                      <TD className="text-right">
                        {t.status === "verified" ? (
                          <a
                            href={`/api/receipts/${t.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                          >
                            <Download className="h-4 w-4" /> PDF
                          </a>
                        ) : (
                          <span className="text-xs text-stone-400">Not issued</span>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {transactions.some((t) => t.status === "pending") && (
        <p className="mt-3 text-xs text-stone-400">
          Payments marked “Pending” are awaiting verification by the administrator.
        </p>
      )}
    </div>
  );
}