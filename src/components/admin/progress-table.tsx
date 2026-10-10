"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress";
import { CourseStatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ProgressForm } from "@/components/teacher/progress-form";
import type { CourseStatus } from "@/lib/types";

export interface AdminProgressRow {
  studentId: string;
  fullName: string;
  registrationNumber: string;
  enrollmentId: string | null;
  classesCompleted: number;
  totalClasses: number;
  status: CourseStatus;
  completionDate: string | null;
  adminRemarks: string | null;
  examExceptionAllowed: boolean;
}

export function AdminProgressTable({ rows }: { rows: AdminProgressRow[] }) {
  const [query, setQuery] = React.useState("");
  const [editTarget, setEditTarget] = React.useState<AdminProgressRow | null>(null);

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.registrationNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students"
          className="pl-9"
        />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Progress</TH>
            <TH>Status</TH>
            <TH>Exception</TH>
            <TH className="text-right">Action</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((r) => (
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
              <TD className="min-w-[160px]">
                <ProgressBar value={r.classesCompleted} max={r.totalClasses} />
                <span className="mt-1 block text-xs text-stone-400">
                  {r.classesCompleted}/{r.totalClasses} classes
                </span>
              </TD>
              <TD>
                <CourseStatusBadge status={r.status} />
              </TD>
              <TD>
                {r.examExceptionAllowed ? (
                  <Badge tone="amber">Allowed</Badge>
                ) : (
                  <span className="text-xs text-stone-400">—</span>
                )}
              </TD>
              <TD className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!r.enrollmentId}
                  onClick={() => setEditTarget(r)}
                >
                  Update
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No students found.</p>
      )}

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Progress · ${editTarget.fullName}` : "Update progress"}
        size="lg"
      >
        {editTarget?.enrollmentId && (
          <ProgressForm
            enrollmentId={editTarget.enrollmentId}
            totalClasses={editTarget.totalClasses}
            classesCompleted={editTarget.classesCompleted}
            status={editTarget.status}
            completionDate={editTarget.completionDate}
            adminRemarks={editTarget.adminRemarks}
            examExceptionAllowed={editTarget.examExceptionAllowed}
            isAdmin
          />
        )}
      </Modal>
    </div>
  );
}