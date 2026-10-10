import { PageHeader } from "@/components/ui/page-header";
import { PaymentConsole, type PaymentConsoleStudent } from "@/components/admin/payment-console";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, financeRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, registration_number")
      .eq("status", "approved")
      .order("full_name"),
    supabase.from("v_student_finance").select("student_id, outstanding_due, currency, payment_status"),
  ]);

  const financeByStudent = new Map((financeRes.data ?? []).map((f) => [f.student_id, f]));

  const students: PaymentConsoleStudent[] = (studentsRes.data ?? []).map((s) => {
    const finance = financeByStudent.get(s.id);
    return {
      id: s.id,
      full_name: s.full_name,
      registration_number: s.registration_number,
      outstanding: Number(finance?.outstanding_due ?? 0),
      currency: finance?.currency ?? "INR",
      paymentStatus: (finance?.payment_status as PaymentStatus) ?? "unpaid",
    };
  });

  return (
    <div>
      <PageHeader
        title="Record Payment"
        description="Record a cash, UPI, bank or cheque payment received at the office. It will be pending until verified."
      />
      <PaymentConsole students={students} />
    </div>
  );
}