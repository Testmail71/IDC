"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { paymentSchema, refundSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/actions/student";

export async function recordPaymentAction(input: {
  studentId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
  remarks?: string;
  proofPath?: string;
  idempotencyKey: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const parsed = paymentSchema.safeParse({
    student_id: input.studentId,
    amount: input.amount,
    payment_date: input.paymentDate,
    method: input.method,
    reference: input.reference ?? "",
    remarks: input.remarks ?? "",
    idempotency_key: input.idempotencyKey,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }

  const { data, error } = await supabase.rpc("record_payment", {
    p_student_id: parsed.data.student_id,
    p_amount: parsed.data.amount,
    p_payment_date: parsed.data.payment_date,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference || null,
    p_remarks: parsed.data.remarks || null,
    p_received_by: session.user.id,
    p_idempotency_key: parsed.data.idempotency_key,
    p_proof_path: input.proofPath || null,
  });
  if (error) return { error: error.message };

  const result = data as unknown as {
    p_payment_id: string;
    p_receipt_number: string;
    p_duplicate: boolean;
  };

  if (result.p_duplicate) {
    return { ok: true, message: `Payment already recorded (receipt ${result.p_receipt_number}).` };
  }

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PAYMENT_RECORDED,
    entityType: "payment_transaction",
    entityId: result.p_payment_id,
    description: `Recorded ${formatCurrency(parsed.data.amount)} from student (receipt ${result.p_receipt_number})`,
    metadata: { student_id: parsed.data.student_id, method: parsed.data.method },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dues");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Payment recorded. Receipt ${result.p_receipt_number} is pending verification.`,
  };
}

export async function verifyPaymentAction(paymentId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("verify_payment", {
    p_payment_id: paymentId,
    p_verified_by: session.user.id,
  });
  if (error) return { error: error.message };

  const { data: txn } = await supabase
    .from("payment_transactions")
    .select("student_id, amount, receipt_number, currency")
    .eq("id", paymentId)
    .maybeSingle();

  if (txn) {
    await notifyUser(supabase, {
      userId: txn.student_id,
      title: "Payment verified",
      body: `Your payment of ${formatCurrency(txn.amount)} has been verified. Receipt ${txn.receipt_number} is now available.`,
      type: "receipt",
      link: "/student/payments",
    });
  }

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
    entityType: "payment_transaction",
    entityId: paymentId,
    description: `Verified payment ${txn?.receipt_number ?? paymentId}`,
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dues");
  revalidatePath("/admin");
  return { ok: true, message: "Payment verified and receipt issued." };
}

export async function rejectPaymentAction(
  paymentId: string,
  note?: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("reject_payment", {
    p_payment_id: paymentId,
    p_admin_id: session.user.id,
    p_note: note || null,
  });
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PAYMENT_REJECTED,
    entityType: "payment_transaction",
    entityId: paymentId,
    description: "Rejected a payment",
    metadata: { note: note ?? null },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dues");
  return { ok: true, message: "Payment rejected." };
}

export async function revertPaymentAction(
  paymentId: string,
  note?: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("revert_payment", {
    p_payment_id: paymentId,
    p_admin_id: session.user.id,
    p_note: note || null,
  });
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.PAYMENT_REVERTED,
    entityType: "payment_transaction",
    entityId: paymentId,
    description: "Reverted a verified payment",
    metadata: { note: note ?? null },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dues");
  revalidatePath("/admin");
  return { ok: true, message: "Payment reverted." };
}

export async function recordRefundAction(input: {
  paymentId: string;
  amount: number;
  refundDate: string;
  method: string;
  reference?: string;
  reason: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const parsed = refundSchema.safeParse({
    payment_id: input.paymentId,
    amount: input.amount,
    refund_date: input.refundDate,
    method: input.method,
    reference: input.reference ?? "",
    reason: input.reason,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid refund." };
  }

  const { data: payment } = await supabase
    .from("payment_transactions")
    .select("student_id, amount, status")
    .eq("id", parsed.data.payment_id)
    .maybeSingle();
  if (!payment) return { error: "Original payment not found." };
  if (payment.status !== "verified") {
    return { error: "Refunds can only be recorded against a verified payment." };
  }
  if (parsed.data.amount > Number(payment.amount)) {
    return { error: "Refund cannot exceed the original payment amount." };
  }

  const { error } = await supabase.from("payment_refunds").insert({
    payment_id: parsed.data.payment_id,
    student_id: payment.student_id,
    amount: parsed.data.amount,
    refund_date: parsed.data.refund_date,
    method: parsed.data.method,
    reference: parsed.data.reference || null,
    reason: parsed.data.reason,
    status: "pending",
    recorded_by: session.user.id,
  });
  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.REFUND_RECORDED,
    entityType: "payment_refund",
    entityId: parsed.data.payment_id,
    description: `Recorded refund ${formatCurrency(parsed.data.amount)} (pending confirmation)`,
  });

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/dues");
  return { ok: true, message: "Refund recorded and pending confirmation." };
}

export async function setRefundStatusAction(
  refundId: string,
  status: "confirmed" | "cancelled",
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_refund_status", {
    p_refund_id: refundId,
    p_status: status,
    p_admin_id: session.user.id,
  });
  if (error) return { error: error.message };

  const { data: refund } = await supabase
    .from("payment_refunds")
    .select("student_id, amount")
    .eq("id", refundId)
    .maybeSingle();

  if (refund && status === "confirmed") {
    await notifyUser(supabase, {
      userId: refund.student_id,
      title: "Refund confirmed",
      body: `Your refund of ${formatCurrency(refund.amount)} has been confirmed.`,
      type: "payment",
      link: "/student/payments",
    });
  }

  await recordAudit(supabase, {
    action: status === "confirmed" ? AUDIT_ACTIONS.REFUND_CONFIRMED : AUDIT_ACTIONS.REFUND_RECORDED,
    entityType: "payment_refund",
    entityId: refundId,
    description: `Refund ${status}`,
  });

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/dues");
  return { ok: true, message: `Refund ${status}.` };
}