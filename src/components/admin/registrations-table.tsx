"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { approveRegistrationAction, rejectRegistrationAction } from "@/actions/registration";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export interface PendingRegistration {
  id: string;
  full_name: string;
  registration_number: string;
  email: string;
  phone: string;
  gender: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

export function RegistrationsTable({
  registrations,
  teachers,
}: {
  registrations: PendingRegistration[];
  teachers: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [rowPending, setRowPending] = React.useState<string | null>(null);
  const [teacherByRow, setTeacherByRow] = React.useState<Record<string, string>>({});
  const [rejectTarget, setRejectTarget] = React.useState<PendingRegistration | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  async function approve(reg: PendingRegistration) {
    setError(null);
    setDone(null);
    setRowPending(reg.id);
    const res = await approveRegistrationAction(reg.id, teacherByRow[reg.id] || null);
    setRowPending(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(`Approved ${reg.full_name}.`);
    router.refresh();
  }

  async function reject() {
    if (!rejectTarget) return;
    setError(null);
    setRowPending(rejectTarget.id);
    const res = await rejectRegistrationAction(rejectTarget.id, rejectReason);
    setRowPending(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(`Rejected ${rejectTarget.full_name}.`);
    setRejectTarget(null);
    setRejectReason("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {done && <Alert variant="success">{done}</Alert>}

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              {["Applicant", "Contact", "Location", "Assign teacher", "Actions"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {registrations.map((reg) => (
              <tr key={reg.id} className="align-top transition-colors hover:bg-stone-50/60">
                <td className="px-3 py-3">
                  <p className="font-medium text-stone-900">{reg.full_name}</p>
                  <p className="text-xs text-stone-400">{reg.registration_number}</p>
                </td>
                <td className="px-3 py-3 text-sm text-stone-600">
                  <p className="break-all">{reg.email}</p>
                  <p className="text-xs text-stone-400">{reg.phone}</p>
                </td>
                <td className="px-3 py-3 text-sm text-stone-600">
                  {[reg.city, reg.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-3">
                  <Select
                    value={teacherByRow[reg.id] ?? ""}
                    onChange={(e) =>
                      setTeacherByRow((prev) => ({ ...prev, [reg.id]: e.target.value }))
                    }
                    className="min-w-[180px]"
                  >
                    <option value="">No teacher yet</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      loading={rowPending === reg.id}
                      onClick={() => approve(reg)}
                    >
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(reg)}
                    >
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        title="Reject registration"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={rowPending === rejectTarget?.id}
              onClick={reject}
            >
              Confirm rejection
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-stone-600">
          Provide a reason for rejecting <strong>{rejectTarget?.full_name}</strong>. This will be
          sent to the applicant.
        </p>
        <Textarea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
        />
      </Modal>
    </div>
  );
}