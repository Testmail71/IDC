"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Send, ShieldOff } from "lucide-react";

import {
  issueCertificateAction,
  publishCertificateAction,
  revokeCertificateAction,
} from "@/actions/certificate";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CertificateStatusBadge } from "@/components/ui/status-badge";
import { BUCKETS } from "@/lib/constants";
import { uniqFileName } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { CertificateStatus } from "@/lib/types";

export interface CertificateRow {
  id: string;
  certificate_number: string;
  status: CertificateStatus;
  version: number;
  issue_date: string;
  is_active: boolean;
}

export function CertificateManager({
  studentId,
  certificates,
  maxMb,
}: {
  studentId: string;
  certificates: CertificateRow[];
  maxMb: number;
}) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<CertificateRow | null>(null);
  const [revokeReason, setRevokeReason] = React.useState("");

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMessage({ type: "error", text: "Choose a PDF certificate to upload." });
    if (file.type !== "application/pdf") {
      return setMessage({ type: "error", text: "Certificates must be uploaded as PDF." });
    }
    if (file.size > maxMb * 1024 * 1024) {
      return setMessage({ type: "error", text: `File must be smaller than ${maxMb} MB.` });
    }

    setPending("upload");
    setMessage(null);
    try {
      const supabase = createClient();
      const path = `${studentId}/${uniqFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.certificates)
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;

      const res = await issueCertificateAction({
        studentId,
        filePath: path,
        fileName: file.name,
        issueDate,
      });
      if (res.error) throw new Error(res.error);
      setMessage({ type: "success", text: res.message ?? "Certificate uploaded." });
      if (fileRef.current) fileRef.current.value = "";
      setFileName(null);
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setPending(null);
    }
  }

  async function publish(id: string) {
    setPending(id);
    setMessage(null);
    const res = await publishCertificateAction(id);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Published." });
    router.refresh();
  }

  async function revoke() {
    if (!revokeTarget) return;
    setPending(revokeTarget.id);
    setMessage(null);
    const res = await revokeCertificateAction(revokeTarget.id, revokeReason);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Revoked." });
    setRevokeTarget(null);
    setRevokeReason("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}

      <div className="rounded-lg border border-stone-200 p-4">
        <p className="mb-3 text-sm font-semibold text-stone-700">Upload a new certificate</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Issue date" htmlFor="cert_issue_date">
            <Input
              id="cert_issue_date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </Field>
          <Field label="Certificate PDF" htmlFor="cert_file">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                id="cert_file"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" /> Choose file
              </Button>
              <span className="truncate text-sm text-stone-500">
                {fileName ?? `PDF · max ${maxMb} MB`}
              </span>
            </div>
          </Field>
        </div>
        <div className="mt-3">
          <Button loading={pending === "upload"} onClick={upload}>
            <FileUp className="h-4 w-4" /> Upload as draft
          </Button>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          A certificate number is generated automatically. The certificate stays a draft until published.
        </p>
      </div>

      {certificates.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                {["Number", "Version", "Issued", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {certificates.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5 text-sm font-medium text-stone-900">
                    {c.certificate_number}
                  </td>
                  <td className="px-3 py-2.5 text-sm">v{c.version}</td>
                  <td className="px-3 py-2.5 text-sm">{formatDate(c.issue_date)}</td>
                  <td className="px-3 py-2.5">
                    <CertificateStatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {c.status === "draft" && (
                        <Button size="sm" loading={pending === c.id} onClick={() => publish(c.id)}>
                          <Send className="h-4 w-4" /> Publish
                        </Button>
                      )}
                      {c.status !== "revoked" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRevokeTarget(c)}
                        >
                          <ShieldOff className="h-4 w-4" /> Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title="Revoke certificate"
        footer={
          <>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={pending === revokeTarget?.id} onClick={revoke}>
              Revoke certificate
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-stone-600">
          Revoking <strong>{revokeTarget?.certificate_number}</strong> removes the student&apos;s
          ability to download it and marks the verification as revoked.
        </p>
        <Input
          value={revokeReason}
          onChange={(e) => setRevokeReason(e.target.value)}
          placeholder="Reason for revoking"
        />
      </Modal>
    </div>
  );
}