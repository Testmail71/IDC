"use client";

import * as React from "react";
import { FileUp } from "lucide-react";

import { submitExamAction } from "@/actions/exam";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { BUCKETS } from "@/lib/constants";
import { uniqFileName } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export function ExamSubmitForm({
  userId,
  maxMb,
  isResubmission,
}: {
  userId: string;
  maxMb: number;
  isResubmission: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0];
    const examinationDate = String(form.get("examination_date") ?? "");

    if (!file) {
      setError("Attach your examination sheet (PDF or image).");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      setError("Upload a PDF or image file.");
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File must be smaller than ${maxMb} MB.`);
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const path = `${userId}/${uniqFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.examSheets)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const res = await submitExamAction({
        path,
        fileName: file.name,
        examinationDate,
        remarks: String(form.get("remarks") ?? ""),
      });
      if (res.error) throw new Error(res.error);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <Alert variant="success" title="Sheet submitted">
        Your examination sheet has been submitted and will be evaluated by the IDC
        department. You will be notified once the result is published.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of examination" htmlFor="examination_date">
          <Input
            id="examination_date"
            name="examination_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>
        <Field label="Sheet file" htmlFor="file">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              id="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Choose file
            </Button>
            <span className="truncate text-sm text-stone-500">
              {fileName ?? `PDF or image · max ${maxMb} MB`}
            </span>
          </div>
        </Field>
      </div>
      <Field label="Remarks (optional)" htmlFor="remarks">
        <Textarea id="remarks" name="remarks" rows={2} placeholder="Anything the examiner should know." />
      </Field>
      <Button type="submit" loading={pending}>
        {isResubmission ? "Submit new sheet" : "Submit examination sheet"}
      </Button>
    </form>
  );
}