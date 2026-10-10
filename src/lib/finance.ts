import type { PaymentStatus } from "@/lib/types";

export interface FinanceParts {
  course_fee: number;
  registration_fee: number;
  additional_charges: number;
  discount_amount: number;
  late_fee: number;
  fee_waived: boolean;
  verifiedPaid: number;
  confirmedRefunds: number;
  hasPayments: boolean;
}

export interface FinanceResult {
  totalPayable: number;
  verifiedPaid: number;
  confirmedRefunds: number;
  netPaid: number;
  outstandingDue: number;
  status: PaymentStatus;
}

/**
 * Mirrors the database-backed calculation. The authoritative source is the
 * `v_student_finance` view; this helper is used for previews and client-side
 * displays, never for writing totals back to the database.
 */
export function computeFinance(parts: FinanceParts): FinanceResult {
  const payable =
    Math.max(0, parts.course_fee + parts.registration_fee) -
    Math.max(0, parts.discount_amount) +
    Math.max(0, parts.additional_charges) +
    (parts.late_fee > 0 ? parts.late_fee : 0);

  const netPaid = Math.max(
    0,
    Math.round((parts.verifiedPaid - parts.confirmedRefunds) * 100) / 100,
  );
  const due = Math.max(0, Math.round((payable - netPaid) * 100) / 100);

  let status: PaymentStatus;
  if (netPaid >= payable && netPaid > 0) {
    status = netPaid > payable ? "overpaid" : "paid";
  } else if (netPaid > 0 && due > 0) {
    status = "partially_paid";
  } else if (parts.hasPayments && parts.confirmedRefunds > 0 && netPaid === 0) {
    status = "refunded";
  } else if (payable <= 0 && parts.fee_waived) {
    status = "waived";
  } else if (payable <= 0 && netPaid === 0) {
    status = "waived";
  } else {
    status = "unpaid";
  }

  return {
    totalPayable: payable,
    verifiedPaid: parts.verifiedPaid,
    confirmedRefunds: parts.confirmedRefunds,
    netPaid,
    outstandingDue: due,
    status,
  };
}

export function isFinanceOwner(role: string): boolean {
  return role === "admin" || role === "super_admin";
}