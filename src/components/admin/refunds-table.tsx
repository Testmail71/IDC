"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { setRefundStatusAction } from "@/actions/payment";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface RefundRow {
  id: string;
  studentId: string;
  studentName: string;
  paymentId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  refundDate: string;
  method: string;
  reason: string;
  status: "pending" | "confirmed" | "cancelled";
}

const STATUS_TONES = {
  pending: "amber",
  confirmed: "green",
  cancelled: "stone",
} as const;

export function RefundsTable({ rows }: { rows: RefundRow[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  async function update(id: string, status: "confirmed" | "cancelled") {
    setPending(id);
    setMessage(null);
    const res = await setRefundStatusAction(id, status);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Updated." });
    router.refresh();
  }

  return (
    <div>
      {message && (
        <div className="mb-4">
          <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
        </div>
      )}
      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Receipt</TH>
            <TH className="text-right">Amount</TH>
            <TH>Date</TH>
            <TH>Reason</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD>
                <Link
                  href={`/admin/students/${r.studentId}`}
                  className="font-medium text-stone-900 hover:text-maroon-800"
                >
                  {r.studentName}
                </Link>
              </TD>
              <TD className="text-sm text-stone-500">{r.receiptNumber}</TD>
              <TD className="text-right font-medium">{formatCurrency(r.amount, r.currency)}</TD>
              <TD>{formatDate(r.refundDate)}</TD>
              <TD className="max-w-xs text-sm text-stone-500">{r.reason}</TD>
              <TD>
                <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>
              </TD>
              <TD>
                <div className="flex justify-end gap-1.5">
                  {r.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        loading={pending === r.id}
                        onClick={() => update(r.id, "confirmed")}
                      >
                        <Check className="h-4 w-4" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => update(r.id, "cancelled")}
                      >
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    </>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No refunds recorded.</p>
      )}
    </div>
  );
}