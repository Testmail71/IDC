import { formatCurrency, toWhatsAppNumber } from "@/lib/utils";

export interface ReminderContext {
  studentName: string;
  amountDue: number;
  phone: string;
  templeName?: string;
}

export function buildDuesReminderMessage(ctx: ReminderContext): string {
  const temple = ctx.templeName ? ` ${ctx.templeName}` : "";
  return (
    `Hare Krishna! Our records show an outstanding IDC course fee of ${formatCurrency(ctx.amountDue)}. ` +
    `Please contact the${temple} IDC administration regarding your remaining balance. Thank you.`
  );
}

export function buildPaymentReceivedMessage(ctx: {
  studentName: string;
  amount: number;
  receiptNumber: string;
}): string {
  return (
    `Hare Krishna ${ctx.studentName}! We have received your IDC course fee payment of ` +
    `${formatCurrency(ctx.amount)}. Receipt No. ${ctx.receiptNumber}. Thank you.`
  );
}

/** Build a wa.me deep link; the message is prepared for review before sending. */
export function waLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}