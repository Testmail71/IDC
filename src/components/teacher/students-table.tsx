"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { CourseStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { CourseStatus, PaymentStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface TeacherStudentRow {
  id: string;
  full_name: string;
  registration_number: string;
  classesCompleted: number;
  totalClasses: number;
  courseStatus: CourseStatus;
  paymentStatus?: PaymentStatus;
  outstanding?: number;
  currency?: string;
  showFinance: boolean;
}

export function TeacherStudentsTable({ rows }: { rows: TeacherStudentRow[] }) {
  const [query, setQuery] = React.useState("");
  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.registration_number.toLowerCase().includes(q)
    );
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No students assigned"
        description="Students assigned to you by the administrator will appear here."
      />
    );
  }

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or registration number"
          className="pl-9"
        />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Progress</TH>
            <TH>Course status</TH>
            {rows[0]?.showFinance && <TH>Payment</TH>}
            <TH className="text-right">Action</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((r) => (
            <TR key={r.id}>
              <TD>
                <span className="block font-medium text-stone-900">{r.full_name}</span>
                <span className="text-xs text-stone-400">{r.registration_number}</span>
              </TD>
              <TD className="min-w-[160px]">
                <ProgressBar value={r.classesCompleted} max={r.totalClasses} />
                <span className="mt-1 block text-xs text-stone-400">
                  {r.classesCompleted}/{r.totalClasses} classes
                </span>
              </TD>
              <TD>
                <CourseStatusBadge status={r.courseStatus} />
              </TD>
              {r.showFinance && (
                <TD>
                  <div className="flex flex-col gap-1">
                    {r.paymentStatus && <PaymentStatusBadge status={r.paymentStatus} />}
                    {(r.outstanding ?? 0) > 0 && (
                      <span className="text-xs text-red-600">
                        Due {formatCurrency(r.outstanding ?? 0, r.currency ?? "INR")}
                      </span>
                    )}
                  </div>
                </TD>
              )}
              <TD className="text-right">
                <Link
                  href={`/teacher/students/${r.id}`}
                  className="text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                >
                  View
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No students match your search.</p>
      )}
    </div>
  );
}