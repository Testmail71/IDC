"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/actions/student";

export async function sendDueReminderAction(
  studentId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { data: finance } = await supabase
    .from("v_student_finance")
    .select("outstanding_due, currency")
    .eq("student_id", studentId)
    .maybeSingle();

  const due = Number(finance?.outstanding_due ?? 0);
  const currency = finance?.currency ?? "INR";
  if (due <= 0) {
    return { error: "This student has no outstanding balance." };
  }

  await notifyUser(supabase, {
    userId: studentId,
    title: "Payment reminder",
    body: `You have an outstanding balance of ${formatCurrency(due, currency)}. Kindly pay at the temple office at your earliest convenience.`,
    type: "dues",
    link: "/student/payments",
  });

  await recordAudit(supabase, {
    action: AUDIT_ACTIONS.NOTIFICATION_CREATED,
    entityType: "student",
    entityId: studentId,
    description: `Sent a payment reminder for ${formatCurrency(due, currency)}`,
    metadata: { sent_by: session.user.id },
  });

  revalidatePath("/admin/dues");
  return { ok: true, message: "Reminder sent." };
}