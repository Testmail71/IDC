"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";

import { assignTeacherAction } from "@/actions/registration";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export function AssignTeacherControl({
  studentId,
  currentTeacherId,
  teachers,
}: {
  studentId: string;
  currentTeacherId: string | null;
  teachers: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(currentTeacherId ?? "");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    const res = await assignTeacherAction(studentId, value || null);
    setPending(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
      return;
    }
    setMessage({ type: "success", text: res.message ?? "Saved." });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={value} onChange={(e) => setValue(e.target.value)} className="flex-1">
          <option value="">No teacher assigned</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </Select>
        <Button onClick={save} loading={pending} disabled={value === (currentTeacherId ?? "")}>
          <UserCog className="h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}