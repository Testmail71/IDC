"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Undo2 } from "lucide-react";

import {
  publishResultAction,
  requestResubmissionAction,
  saveEvaluationAction,
} from "@/actions/exam-admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";

export function ExamEvaluationForm({
  submissionId,
  initialResult,
  initialFeedback,
  published,
}: {
  submissionId: string;
  initialResult: "qualified" | "not_qualified" | "";
  initialFeedback: string;
  published: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = React.useState<string>(initialResult || "qualified");
  const [feedback, setFeedback] = React.useState(initialFeedback);
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  async function save() {
    setPending("save");
    setMessage(null);
    const res = await saveEvaluationAction({
      submissionId,
      result: result as "qualified" | "not_qualified",
      studentFeedback: feedback,
    });
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Saved." });
    router.refresh();
  }

  async function publish() {
    setPending("publish");
    setMessage(null);
    const saved = await saveEvaluationAction({
      submissionId,
      result: result as "qualified" | "not_qualified",
      studentFeedback: feedback,
    });
    if (saved.error) {
      setPending(null);
      return setMessage({ type: "error", text: saved.error });
    }
    const res = await publishResultAction(submissionId);
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Published." });
    router.refresh();
  }

  async function requestResubmit() {
    setPending("resubmit");
    setMessage(null);
    const res = await requestResubmissionAction({ submissionId, feedback });
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Requested." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}
      {published && <Alert variant="info">This result has been published to the student.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Result" htmlFor="result">
          <Select id="result" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="qualified">Qualified</option>
            <option value="not_qualified">Not Qualified</option>
          </Select>
        </Field>
      </div>
      <Field label="Feedback to student" htmlFor="feedback">
        <Textarea
          id="feedback"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="This feedback is shown to the student (and used for resubmission requests)."
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" loading={pending === "save"} onClick={save}>
          <Save className="h-4 w-4" /> Save draft
        </Button>
        <Button loading={pending === "publish"} onClick={publish}>
          <Send className="h-4 w-4" /> Save &amp; publish
        </Button>
        <Button variant="subtle" loading={pending === "resubmit"} onClick={requestResubmit}>
          <Undo2 className="h-4 w-4" /> Request resubmission
        </Button>
      </div>
    </div>
  );
}