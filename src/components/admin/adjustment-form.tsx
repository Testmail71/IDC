"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Percent } from "lucide-react";

import { applyAdjustmentAction } from "@/actions/fee";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export function AdjustmentForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);
  const [type, setType] = React.useState("discount_fixed");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setMessage(null);
    const res = await applyAdjustmentAction({
      studentId,
      adjustmentType: type as "discount_fixed" | "discount_percent" | "waiver" | "additional_charge" | "correction",
      amount: Number(form.get("amount") ?? 0),
      reason: String(form.get("reason") ?? ""),
    });
    setPending(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
      return;
    }
    setMessage({ type: "success", text: res.message ?? "Adjustment applied." });
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  const isPercent = type === "discount_percent";
  const noAmount = type === "waiver";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}
      <Field label="Adjustment type" htmlFor="adjustment_type">
        <Select
          id="adjustment_type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="discount_fixed">Discount (fixed amount)</option>
          <option value="discount_percent">Discount (percentage)</option>
          <option value="waiver">Full waiver</option>
          <option value="additional_charge">Additional charge</option>
          <option value="correction">Correction (set discount)</option>
        </Select>
      </Field>
      {!noAmount && (
        <Field
          label={isPercent ? "Percentage (%)" : "Amount"}
          htmlFor="amount"
          hint={type === "correction" ? "This replaces the discount amount." : undefined}
        >
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
          />
        </Field>
      )}
      <Field label="Reason" htmlFor="reason">
        <Textarea id="reason" name="reason" rows={2} required placeholder="Why is this adjustment being applied?" />
      </Field>
      <Button type="submit" loading={pending}>
        <Percent className="h-4 w-4" /> Apply adjustment
      </Button>
    </form>
  );
}