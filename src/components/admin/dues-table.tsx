"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, Search } from "lucide-react";

import { sendDueReminderAction } from "@/actions/reminders";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate, toWhatsAppNumber } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

export interface DueRow {
  studentId: string;
  fullName: string;
  registrationNumber: string;
  phone: string;
  whatsapp: string | null;
  outstanding: number;
  currency: string;
  paymentStatus: PaymentStatus;
  dueDate: string | null;
  lastPaymentDate: string | null;
}

const REMINDER_TEMPLATE =
  "Hare Krishna 🙏\n\nThis is a friendly reminder from the ISKCON Disciples Course department that the following dues are pending for your course:\n\nAmount due: {AMOUNT}\n\nKindly pay at the temple office (cash / UPI / bank transfer) and collect your receipt. Please ignore if already paid.\n\nThank you.";

export function DuesTable({ rows }: { rows: DueRow[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.registrationNumber.toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  async function remind(studentId: string) {
    setPending(studentId);
    setMessage(null);
    const res = await sendDueReminderAction(studentId);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Reminder sent." });
    router.refresh();
  }

  return (
    <div>
      {message && (
        <div className="mb-4">
          <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
        </div>
      )}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, registration or phone"
          className="pl-9"
        />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Contact</TH>
            <TH className="text-right">Outstanding</TH>
            <TH>Status</TH>
            <TH>Last payment</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((r) => {
            const waNumber = toWhatsAppNumber(r.whatsapp || r.phone);
            const waText = encodeURIComponent(
              REMINDER_TEMPLATE.replace(
                "{AMOUNT}",
                formatCurrency(r.outstanding, r.currency),
              ),
            );
            return (
              <TR key={r.studentId}>
                <TD>
                  <Link
                    href={`/admin/students/${r.studentId}`}
                    className="font-medium text-stone-900 hover:text-maroon-800"
                  >
                    {r.fullName}
                  </Link>
                  <span className="block text-xs text-stone-400">{r.registrationNumber}</span>
                </TD>
                <TD className="text-xs text-stone-500">{r.phone}</TD>
                <TD className="text-right font-medium text-red-600">
                  {formatCurrency(r.outstanding, r.currency)}
                </TD>
                <TD>
                  <PaymentStatusBadge status={r.paymentStatus} />
                </TD>
                <TD className="text-sm text-stone-500">
                  {r.lastPaymentDate ? formatDate(r.lastPaymentDate) : "—"}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => remind(r.studentId)} loading={pending === r.studentId}>
                      <Bell className="h-4 w-4" /> Remind
                    </Button>
                    <a
                      href={`https://wa.me/${waNumber}?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No outstanding dues found.</p>
      )}
    </div>
  );
}