"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";

import { broadcastNotificationAction } from "@/actions/settings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export function BroadcastForm({
  students,
}: {
  students: { id: string; full_name: string; registration_number: string }[];
}) {
  const router = useRouter();
  const [audience, setAudience] = React.useState("all_students");
  const [studentId, setStudentId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [link, setLink] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await broadcastNotificationAction({
      audience: audience as "all_students" | "all_teachers" | "student",
      studentId: audience === "student" ? studentId : undefined,
      title,
      body,
      link,
    });
    setPending(false);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Sent." });
    setTitle("");
    setBody("");
    setLink("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audience" htmlFor="audience">
          <Select
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="all_students">All approved students</option>
            <option value="all_teachers">All active teachers</option>
            <option value="student">A specific student</option>
          </Select>
        </Field>
        {audience === "student" && (
          <Field label="Student" htmlFor="student">
            <Select
              id="student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Select a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.registration_number})
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="Title" htmlFor="title">
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Class schedule update"
          required
        />
      </Field>

      <Field label="Message" htmlFor="body">
        <Textarea
          id="body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </Field>

      <Field label="Link (optional)" htmlFor="link" hint="Where the notification should take the reader.">
        <Input
          id="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="/student/payments"
        />
      </Field>

      <Button type="submit" loading={pending}>
        <Megaphone className="h-4 w-4" /> Send notification
      </Button>
    </form>
  );
}