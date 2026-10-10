"use client";

import * as React from "react";
import {
  BadgeCheck,
  Search,
  ShieldAlert,
  ShieldX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/alert";

type VerifyResult = {
  found: boolean;
  valid?: boolean;
  status?: string;
  certificateNumber?: string;
  issueDate?: string;
  studentName?: string | null;
  registrationNumber?: string | null;
  courseName?: string;
  templeName?: string;
  revokedReason?: string | null;
};

export function VerifyForm() {
  const [serial, setSerial] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<VerifyResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!serial.trim()) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/certificates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "Verification failed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <Field
          label="Certificate number"
          htmlFor="serial"
          hint="Example: IDC-C-2026-0001 — as printed on the certificate."
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value.toUpperCase())}
              placeholder="IDC-C-2026-0001"
              required
            />
            <Button type="submit" size="md" className="shrink-0" loading={pending}>
              {!pending && <Search className="h-4 w-4" />}
              Verify
            </Button>
          </div>
        </Field>
      </form>

      {pending && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-stone-500">
          <Spinner /> Checking the registry…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && !result.found && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">No certificate found</p>
              <p className="mt-1 text-sm text-amber-800">
                We could not find a certificate with that number. Please check the
                spelling and try again, or contact the IDC department.
              </p>
            </div>
          </div>
        </div>
      )}

      {result && result.found && result.valid && (
        <div className="overflow-hidden rounded-xl border border-emerald-200">
          <div className="flex items-start gap-3 bg-emerald-50 p-6">
            <BadgeCheck className="mt-0.5 h-7 w-7 text-emerald-600" />
            <div>
              <p className="text-lg font-bold text-emerald-900">Valid certificate</p>
              <p className="mt-1 text-sm text-emerald-800">
                This certificate was issued by {result.templeName} and is currently valid.
              </p>
            </div>
          </div>
          <dl className="divide-y divide-stone-100 bg-white">
            <Row label="Certificate number" value={result.certificateNumber} />
            <Row label="Student" value={result.studentName ?? "—"} />
            <Row label="Registration number" value={result.registrationNumber ?? "—"} />
            <Row label="Course" value={result.courseName ?? "—"} />
            <Row
              label="Issue date"
              value={result.issueDate ? new Date(result.issueDate).toLocaleDateString() : "—"}
            />
            <Row label="Status" value="Published / Valid" />
          </dl>
        </div>
      )}

      {result && result.found && !result.valid && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldX className="mt-0.5 h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">
                {result.status === "revoked" ? "Certificate revoked" : "Certificate not valid"}
              </p>
              <p className="mt-1 text-sm text-red-800">
                {result.status === "revoked"
                  ? result.revokedReason || "This certificate has been revoked by the issuing authority."
                  : "This certificate has not been published or is no longer valid."}
              </p>
              <p className="mt-2 text-xs text-red-700">
                Certificate number: {result.certificateNumber}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-stone-900">{value || "—"}</dd>
    </div>
  );
}