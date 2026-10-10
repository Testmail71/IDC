"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { adjustAssessmentSchema, adjustmentSchema, feeSettingsSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/student";

function payableOf(row: {
  course_fee: number;
  registration_fee: number;
  additional_charges: number;
  discount_amount: number;
  late_fee: number;
}) {
  return Math.max(
    0,
    Number(row.course_fee) +
      Number(row.registration_fee) -
      Number(row.discount_amount) +
      Number(row.additional_charges) +
      Number(row.late_fee),
  );
}

export async function saveFeeSettingsAction(input: {
  standardFee: number;
  currency?: string;
  registrationFee?: number;
  additionalCharges?: number;
  lateFee?: number;
  lateFeeEnabled?: boolean;
  requirePaymentBeforeCertificate?: boolean;
  paymentInstructions?: string;
  discountRules?: string;
  refundPolicy?: string;
  dueDate?: string;
  effectiveDate: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = feeSettingsSchema.safeParse({
    standard_fee: input.standardFee,
    currency: input.currency || "INR",
    registration_fee: input.registrationFee ?? 0,
    additional_charges: input.additionalCharges ?? 0,
    late_fee: input.lateFee ?? 0,
    late_fee_enabled: input.lateFeeEnabled,
    require_payment_before_certificate: input.requirePaymentBeforeCertificate,
    payment_instructions: input.paymentInstructions ?? "",
    discount_rules: input.discountRules ?? "",
    refund_policy: input.refundPolicy ?? "",
    due_date: input.dueDate ?? "",
    effective_date: input.effectiveDate,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid fee settings." };
  }

  await supabase
    .from("course_fee_settings")
    .update({ is_active: false })
    .eq("is_active", true);

  const { error } = await supabase.from("course_fee_settings").insert({
    standard_fee: parsed.data.standard_fee,
    currency: parsed.data.currency,
    registration_fee: parsed.data.registration_fee,
    additional_charges: parsed.data.additional_charges,
    late_fee: parsed.data.late_fee,
    late_fee_enabled: Boolean(parsed.data.late_fee_enabled),
    require_payment_before_certificate: Boolean(
      parsed.data.require_payment_before_certificate,
    ),
    payment_instructions: parsed.data.payment_instructions || null,
    discount_rules: parsed.data.discount_rules || null,
    refund_policy: parsed.data.refund_policy || null,
    due_date: parsed.data.due_date || null,
    effective_date: parsed.data.effective_date,
    is_active: true,
  });

  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.FEE_SETTINGS_UPDATED,
    entityType: "course_fee_settings",
    description: `Fee updated to ${parsed.data.currency} ${parsed.data.standard_fee}`,
  });

  revalidatePath("/admin/fees");
  revalidatePath("/admin/payments");
  return { ok: true, message: "Fee settings saved. Existing student balances are unchanged." };
}

/** Apply a discount / waiver / additional charge to a single student. */
export async function applyAdjustmentAction(input: {
  studentId: string;
  adjustmentType: "discount_fixed" | "discount_percent" | "waiver" | "additional_charge" | "correction";
  amount: number;
  reason: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const parsed = adjustmentSchema.safeParse({
    adjustment_type: input.adjustmentType,
    amount: input.amount,
    reason: input.reason,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
  }

  const { data: assessment } = await supabase
    .from("student_fee_assessments")
    .select("*")
    .eq("student_id", input.studentId)
    .maybeSingle();

  if (!assessment) {
    return { error: "This student has no fee assessment yet. Approve the registration first." };
  }

  const previousPayable = payableOf(assessment);
  const patch: Record<string, unknown> = {};
  const base = Number(assessment.course_fee) + Number(assessment.registration_fee);

  switch (parsed.data.adjustment_type) {
    case "discount_fixed":
      patch.discount_amount = Number(assessment.discount_amount) + parsed.data.amount;
      break;
    case "discount_percent":
      patch.discount_amount =
        Number(assessment.discount_amount) + (base * parsed.data.amount) / 100;
      break;
    case "waiver":
      patch.fee_waived = true;
      patch.discount_amount = base;
      break;
    case "additional_charge":
      patch.additional_charges =
        Number(assessment.additional_charges) + parsed.data.amount;
      break;
    case "correction":
      patch.discount_amount = parsed.data.amount;
      break;
  }

  patch.reason = parsed.data.reason;
  patch.set_by = session.user.id;

  const { error: updateError } = await supabase
    .from("student_fee_assessments")
    .update(patch)
    .eq("student_id", input.studentId);
  if (updateError) return { error: updateError.message };

  const updated = { ...assessment, ...patch };
  const newPayable = payableOf(updated as typeof assessment);

  const { error: adjError } = await supabase.from("payment_adjustments").insert({
    student_id: input.studentId,
    adjustment_type: parsed.data.adjustment_type,
    previous_payable: previousPayable,
    new_payable: newPayable,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    created_by: session.user.id,
  });
  if (adjError) return { error: adjError.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.FEE_ASSESSMENT_UPDATED,
    entityType: "student_fee_assessment",
    entityId: input.studentId,
    description: `${parsed.data.adjustment_type} of ${parsed.data.amount} applied`,
    metadata: { previous_payable: previousPayable, new_payable: newPayable },
  });

  revalidatePath(`/admin/students/${input.studentId}`);
  revalidatePath("/admin/dues");
  return { ok: true, message: "Adjustment applied." };
}

/** Directly edit a student's fee assessment fields (admin correction). */
export async function updateAssessmentAction(input: {
  studentId: string;
  courseFee: number;
  registrationFee: number;
  additionalCharges: number;
  discountAmount: number;
  lateFee: number;
  feeWaived: boolean;
  dueDate?: string;
  reason: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const parsed = adjustAssessmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid assessment." };
  }

  const { error } = await supabase
    .from("student_fee_assessments")
    .update({
      course_fee: parsed.data.courseFee,
      registration_fee: parsed.data.registrationFee,
      additional_charges: parsed.data.additionalCharges,
      discount_amount: parsed.data.discountAmount,
      late_fee: parsed.data.lateFee,
      fee_waived: parsed.data.feeWaived,
      due_date: parsed.data.dueDate || null,
      reason: parsed.data.reason,
      set_by: session.user.id,
    })
    .eq("student_id", input.studentId);

  if (error) return { error: error.message };

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.FEE_ASSESSMENT_UPDATED,
    entityType: "student_fee_assessment",
    entityId: input.studentId,
    description: "Fee assessment edited directly",
    metadata: { ...parsed.data },
  });

  revalidatePath(`/admin/students/${input.studentId}`);
  revalidatePath("/admin/dues");
  return { ok: true, message: "Fee assessment updated." };
}
