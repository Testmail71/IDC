"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input, Select } from "@/components/ui/input";
import { PaymentStatusBadge, RegistrationStatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { PaymentStatus, RegistrationStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface AdminStudentRow {
  id: string;
  full_name: string;
  registration_number: string;
  email: string;
  phone: string;
  status: RegistrationStatus;
  teacherName: string | null;
  paymentStatus: PaymentStatus | null;
  outstanding: number;
  currency: string;
  classesCompleted: number;
  totalClasses: number;
}

export function StudentsTable({ rows }: { rows: AdminStudentRow[] }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");

  const filtered = rows.filter((r) => {
    if (status && r.status !== status) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.registration_number.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name, registration number, email or phone"
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-52">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Contact</TH>
            <TH>Teacher</TH>
            <TH>Progress</TH>
            <TH>Payment</TH>
            <TH>Status</TH>
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
              <TD className="text-xs text-stone-500">
                <span className="block">{r.email}</span>
                <span>{r.phone}</span>
              </TD>
              <TD className="text-sm">{r.teacherName ?? <span className="text-xs text-stone-400">Unassigned</span>}</TD>
              <TD className="text-sm">
                {r.classesCompleted}/{r.totalClasses}
              </TD>
              <TD>
                <div className="flex flex-col gap-1">
                  {r.paymentStatus && <PaymentStatusBadge status={r.paymentStatus} />}
                  {r.outstanding > 0 && (
                    <span className="text-xs text-red-600">Due {formatCurrency(r.outstanding, r.currency)}</span>
                  )}
                </div>
              </TD>
              <TD>
                <RegistrationStatusBadge status={r.status} />
              </TD>
              <TD className="text-right">
                <Link
                  href={`/admin/students/${r.id}`}
                  className="text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                >
                  Manage
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No students match your filters.</p>
      )}
    </div>
  );
}