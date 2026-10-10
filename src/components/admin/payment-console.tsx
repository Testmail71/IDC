"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { RecordPaymentForm } from "@/components/admin/record-payment-form";
import { formatCurrency } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

export interface PaymentConsoleStudent {
  id: string;
  full_name: string;
  registration_number: string;
  outstanding: number;
  currency: string;
  paymentStatus: PaymentStatus;
}

export function PaymentConsole({ students }: { students: PaymentConsoleStudent[] }) {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const filtered = students
    .filter((s) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.registration_number.toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const selected = students.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Select a student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder="Search approved students"
              className="pl-9"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No students found" />
          ) : (
            <ul className="space-y-1">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      selectedId === s.id
                        ? "border-saffron-400 bg-saffron-50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-medium text-stone-800">{s.full_name}</span>
                      <span className="text-xs text-stone-400">{s.registration_number}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <PaymentStatusBadge status={s.paymentStatus} />
                      {s.outstanding > 0 && (
                        <span className="text-xs text-red-600">
                          Due {formatCurrency(s.outstanding, s.currency)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record a payment</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <EmptyState
              title="No student selected"
              description="Search and select a student to record their payment."
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm">
                <p className="font-medium text-stone-800">{selected.full_name}</p>
                <p className="text-xs text-stone-400">{selected.registration_number}</p>
                <p className="mt-1 text-stone-600">
                  Outstanding: {formatCurrency(selected.outstanding, selected.currency)}
                </p>
              </div>
              <RecordPaymentForm studentId={selected.id} suggestedAmount={selected.outstanding} />
              <Link
                href={`/admin/students/${selected.id}`}
                className="inline-block text-sm font-semibold text-saffron-700 hover:text-saffron-800"
              >
                Open full student record
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}