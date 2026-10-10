import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSession, isAdminRole } from "@/lib/auth";
import { generateReceiptPdf } from "@/lib/pdf";
import { getSettings, settingString } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PaymentStatusTxn,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const role = session.profile?.role ?? "student";
  let allowed = isAdminRole(role);

  if (!allowed && role === "student") {
    allowed = payment.student_id === session.user.id && payment.status === "verified";
  }

  if (!allowed && role === "teacher") {
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", session.user.id)
      .eq("student_id", payment.student_id)
      .eq("is_active", true)
      .maybeSingle();
    const { data: teacher } = await supabase
      .from("teachers")
      .select("can_view_finance")
      .eq("id", session.user.id)
      .maybeSingle();
    allowed = Boolean(assignment && teacher?.can_view_finance);
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (payment.status !== "verified") {
    return NextResponse.json(
      { error: "Receipts are only available for verified payments." },
      { status: 409 },
    );
  }

  const [{ data: student }, { data: finance }, { data: receiver }, settings] =
    await Promise.all([
      supabase.from("students").select("full_name, registration_number").eq("id", payment.student_id).maybeSingle(),
      supabase.from("v_student_finance").select("*").eq("student_id", payment.student_id).maybeSingle(),
      payment.received_by
        ? supabase.from("profiles").select("full_name").eq("id", payment.received_by).maybeSingle()
        : Promise.resolve({ data: null }),
      getSettings(supabase),
    ]);

  const amount = Number(payment.amount);
  const outstanding = Number(finance?.outstanding_due ?? 0);

  const pdfBytes = await generateReceiptPdf({
    templeName: settingString(settings, "temple_name"),
    centerName: settingString(settings, "idc_center_name"),
    receiptNumber: payment.receipt_number,
    paymentDate: payment.payment_date,
    studentName: student?.full_name ?? "Student",
    registrationNumber: student?.registration_number ?? "—",
    amount,
    currencyCode: finance?.currency ?? "INR",
    methodLabel:
      PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method,
    transactionReference: payment.reference,
    previousOutstanding: outstanding + amount,
    remainingOutstanding: outstanding,
    totalFee: Number(finance?.total_payable ?? 0),
    receiverName: receiver?.full_name ?? "",
    statusLabel: (payment.status as PaymentStatusTxn) === "verified" ? "Verified / Paid" : payment.status,
    issuedAt: formatDateTime(payment.verified_at ?? payment.created_at),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payment.receipt_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}