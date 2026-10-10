"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { saveFeeSettingsAction } from "@/actions/fee";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, Textarea } from "@/components/ui/input";

export interface FeeSettingsValues {
  standardFee: number;
  currency: string;
  registrationFee: number;
  additionalCharges: number;
  lateFee: number;
  lateFeeEnabled: boolean;
  requirePaymentBeforeCertificate: boolean;
  paymentInstructions: string;
  discountRules: string;
  refundPolicy: string;
  dueDate: string;
  effectiveDate: string;
}

export function FeeSettingsForm({ initial }: { initial: FeeSettingsValues }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await saveFeeSettingsAction(form);
    setPending(false);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Saved." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Standard course fee" htmlFor="standardFee">
          <Input
            id="standardFee"
            type="number"
            min={0}
            step="0.01"
            value={form.standardFee}
            onChange={(e) => setForm({ ...form, standardFee: Number(e.target.value) })}
          />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Input
            id="currency"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </Field>
        <Field label="Registration fee" htmlFor="registrationFee">
          <Input
            id="registrationFee"
            type="number"
            min={0}
            step="0.01"
            value={form.registrationFee}
            onChange={(e) => setForm({ ...form, registrationFee: Number(e.target.value) })}
          />
        </Field>
        <Field label="Additional charges" htmlFor="additionalCharges">
          <Input
            id="additionalCharges"
            type="number"
            min={0}
            step="0.01"
            value={form.additionalCharges}
            onChange={(e) => setForm({ ...form, additionalCharges: Number(e.target.value) })}
          />
        </Field>
        <Field label="Late fee" htmlFor="lateFee">
          <Input
            id="lateFee"
            type="number"
            min={0}
            step="0.01"
            value={form.lateFee}
            onChange={(e) => setForm({ ...form, lateFee: Number(e.target.value) })}
          />
        </Field>
        <Field label="Due date" htmlFor="dueDate">
          <Input
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </Field>
        <Field label="Effective date" htmlFor="effectiveDate">
          <Input
            id="effectiveDate"
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={form.lateFeeEnabled}
            onChange={(e) => setForm({ ...form, lateFeeEnabled: e.target.checked })}
          />
          <Label className="mb-0">Enable late fee</Label>
        </label>
        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={form.requirePaymentBeforeCertificate}
            onChange={(e) => setForm({ ...form, requirePaymentBeforeCertificate: e.target.checked })}
          />
          <Label className="mb-0">Require full payment before certificate</Label>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Payment instructions" htmlFor="paymentInstructions">
          <Textarea
            id="paymentInstructions"
            rows={3}
            value={form.paymentInstructions}
            onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
          />
        </Field>
        <Field label="Discount rules" htmlFor="discountRules">
          <Textarea
            id="discountRules"
            rows={3}
            value={form.discountRules}
            onChange={(e) => setForm({ ...form, discountRules: e.target.value })}
          />
        </Field>
        <Field label="Refund policy" htmlFor="refundPolicy">
          <Textarea
            id="refundPolicy"
            rows={3}
            value={form.refundPolicy}
            onChange={(e) => setForm({ ...form, refundPolicy: e.target.value })}
          />
        </Field>
      </div>

      <Alert variant="info">
        Changing the fee creates a new active fee. Existing students keep the fee snapshot that was
        applied when their registration was approved.
      </Alert>

      <Button type="submit" loading={pending}>
        <Save className="h-4 w-4" /> Save fee settings
      </Button>
    </form>
  );
}