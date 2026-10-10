"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, RotateCcw, Undo2 } from "lucide-react";

import {
  recordRefundAction,
  rejectPaymentAction,
  revertPaymentAction,
  verifyPaymentAction,
} from "@/actions/payment";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { PaymentStatusTxn } from "@/lib/types";

export function PaymentRowActions({
  paymentId,
  status,
  amount,
  refundable,
}: {
  paymentId: string;
  status: PaymentStatusTxn;
  amount: number;
  currency: string;
  refundable: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [refundAmount, setRefundAmount] = React.useState(String(amount));
  const [refundReason, setRefundReason] = React.useState("");
  const [refundRef, setRefundRef] = React.useState("");

  async function run(action: string, fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setPending(action);
    setError(null);
    const res = await fn();
    setPending(null);
    if (res.error) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function doRefund() {
    const ok = await run("refund", () =>
      recordRefundAction({
        paymentId,
        amount: Number(refundAmount),
        refundDate: new Date().toISOString().slice(0, 10),
        method: "cash",
        reference: refundRef,
        reason: refundReason,
      }),
    );
    if (ok) {
      setRefundOpen(false);
      setRefundReason("");
      setRefundRef("");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {status === "pending" && (
        <>
          <Button
            size="sm"
            loading={pending === "verify"}
            onClick={() => run("verify", () => verifyPaymentAction(paymentId))}
          >
            <Check className="h-4 w-4" /> Verify
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)}>
            <Ban className="h-4 w-4" /> Reject
          </Button>
        </>
      )}
      {status === "verified" && (
        <>
          {refundable && (
            <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)}>
              <Undo2 className="h-4 w-4" /> Refund
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            loading={pending === "revert"}
            onClick={() => run("revert", () => revertPaymentAction(paymentId, "Reverted by admin"))}
          >
            <RotateCcw className="h-4 w-4" /> Revert
          </Button>
        </>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject payment"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending === "reject"}
              onClick={async () => {
                const ok = await run("reject", () => rejectPaymentAction(paymentId, note));
                if (ok) setRejectOpen(false);
              }}
            >
              Confirm rejection
            </Button>
          </>
        }
      >
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
        />
      </Modal>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Record refund"
        footer={
          <>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button loading={pending === "refund"} onClick={doRefund}>
              Record refund
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Alert variant="warning">
            Refunds are recorded against this verified payment and affect the student&apos;s balance
            once confirmed.
          </Alert>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Refund amount
            </label>
            <Input
              type="number"
              value={refundAmount}
              max={amount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Reference</label>
            <Input value={refundRef} onChange={(e) => setRefundRef(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Reason</label>
            <Textarea
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}