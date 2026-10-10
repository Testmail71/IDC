"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { recordPaymentAction } from "@/actions/payment";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PAYMENT_METHODS } from "@/lib/constants";

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function RecordPaymentForm({
  studentId,
  suggestedAmount,
}: {
  studentId: string;
  suggestedAmount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);
  const [key, setKey] = React.useState(newKey());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setMessage(null);
    const res = await recordPaymentAction({
      studentId,
      amount: Number(form.get("amount")),
      paymentDate: String(form.get("payment_date")),
      method: String(form.get("method")),
      reference: String(form.get("reference") ?? ""),
      remarks: String(form.get("remarks") ?? ""),
      idempotencyKey: key,
    });
    setPending(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
      return;
    }
    setMessage({ type: "success", text: res.message ?? "Payment recorded." });
    setKey(newKey());
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount received" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step="0.01"
            defaultValue={suggestedAmount > 0 ? suggestedAmount : ""}
            required
          />
        </Field>
        <Field label="Payment date" htmlFor="payment_date">
          <Input
            id="payment_date"
            name="payment_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>
        <Field label="Method" htmlFor="method">
          <Select id="method" name="method" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference / txn id" htmlFor="reference">
          <Input id="reference" name="reference" placeholder="Optional" />
        </Field>
      </div>
      <Field label="Remarks" htmlFor="remarks">
        <Textarea id="remarks" name="remarks" rows={2} placeholder="Optional" />
      </Field>
      <Button type="submit" loading={pending}>
        <Plus className="h-4 w-4" /> Record payment
      </Button>
      <p className="text-xs text-stone-400">
        Recorded payments are <strong>pending</strong> until you verify them.
      </p>
    </form>
  );
}