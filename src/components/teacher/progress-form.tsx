"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateProgressAction } from "@/actions/progress";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/input";

export function ProgressForm({
  enrollmentId,
  totalClasses,
  classesCompleted,
  status,
  completionDate,
  adminRemarks,
  examExceptionAllowed,
  isAdmin,
}: {
  enrollmentId: string;
  totalClasses: number;
  classesCompleted: number;
  status: string;
  completionDate: string | null;
  adminRemarks: string | null;
  examExceptionAllowed: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);
  const [classes, setClasses] = React.useState(classesCompleted);
  const [statusValue, setStatusValue] = React.useState(status);

  // Keep status consistent with the class count unless deliberately completed.
  function onClassesChange(value: number) {
    const v = Math.max(0, Math.min(totalClasses, value));
    setClasses(v);
    if (v >= totalClasses) setStatusValue("completed");
    else if (v > 0) setStatusValue("in_progress");
    else setStatusValue("not_started");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await updateProgressAction({
        enrollmentId,
        classesCompleted: classes,
        status: statusValue as "not_started" | "in_progress" | "completed",
        completionDate: String(form.get("completion_date") ?? ""),
        adminRemarks: String(form.get("admin_remarks") ?? ""),
        examExceptionAllowed: isAdmin ? form.get("exam_exception_allowed") === "on" : undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOk(true);
      router.refresh();
    } catch {
      setError("Could not save progress. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {ok && <Alert variant="success">Course progress saved.</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Classes completed" htmlFor="classes_completed">
          <Input
            id="classes_completed"
            type="number"
            min={0}
            max={totalClasses}
            value={classes}
            onChange={(e) => onClassesChange(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Completion date" htmlFor="completion_date">
          <Input
            id="completion_date"
            name="completion_date"
            type="date"
            defaultValue={completionDate ?? ""}
          />
        </Field>
      </div>

      <Field label="Remarks" htmlFor="admin_remarks">
        <Textarea
          id="admin_remarks"
          name="admin_remarks"
          rows={2}
          defaultValue={adminRemarks ?? ""}
          placeholder="Optional notes about this student's progress."
        />
      </Field>

      {isAdmin && (
        <label className="flex items-start gap-2.5">
          <Checkbox name="exam_exception_allowed" defaultChecked={examExceptionAllowed} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-stone-700">Allow examination without course completion</span>
            <span className="block text-xs text-stone-400">
              Administrator-only override for special cases.
            </span>
          </span>
        </label>
      )}

      <Button type="submit" loading={pending}>
        Save progress
      </Button>
    </form>
  );
}