"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";

import { createTeacherAction, updateTeacherAction } from "@/actions/teacher";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export interface TeacherRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  can_view_finance: boolean;
  can_publish_results: boolean;
  can_issue_certificates: boolean;
  remarks: string | null;
  studentCount: number;
}

function emptyCreate() {
  return {
    full_name: "",
    email: "",
    phone: "",
    password: "",
    can_view_finance: false,
    can_publish_results: false,
    can_issue_certificates: false,
    remarks: "",
  };
}

export function TeachersManager({ teachers }: { teachers: TeacherRow[] }) {
  const router = useRouter();
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyCreate());

  const [editTarget, setEditTarget] = React.useState<TeacherRow | null>(null);
  const [editForm, setEditForm] = React.useState<TeacherRow | null>(null);

  async function create() {
    setPending("create");
    setMessage(null);
    const res = await createTeacherAction({
      fullName: form.full_name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      canViewFinance: form.can_view_finance,
      canPublishResults: form.can_publish_results,
      canIssueCertificates: form.can_issue_certificates,
      remarks: form.remarks,
    });
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Teacher created." });
    setCreateOpen(false);
    setForm(emptyCreate());
    router.refresh();
  }

  async function saveEdit() {
    if (!editForm) return;
    setPending("edit");
    setMessage(null);
    const res = await updateTeacherAction({
      teacherId: editForm.id,
      fullName: editForm.full_name,
      phone: editForm.phone ?? "",
      canViewFinance: editForm.can_view_finance,
      canPublishResults: editForm.can_publish_results,
      canIssueCertificates: editForm.can_issue_certificates,
      isActive: editForm.is_active,
      remarks: editForm.remarks ?? "",
    });
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Teacher updated." });
    setEditTarget(null);
    setEditForm(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add teacher
        </Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Teacher</TH>
            <TH>Contact</TH>
            <TH>Students</TH>
            <TH>Permissions</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {teachers.map((t) => (
            <TR key={t.id}>
              <TD className="font-medium text-stone-900">{t.full_name}</TD>
              <TD className="text-xs text-stone-500">
                <span className="block">{t.email}</span>
                <span>{t.phone ?? "—"}</span>
              </TD>
              <TD className="text-sm">{t.studentCount}</TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {t.can_view_finance && <Badge tone="green">Finance</Badge>}
                  {t.can_publish_results && <Badge tone="blue">Results</Badge>}
                  {t.can_issue_certificates && <Badge tone="gold">Certificates</Badge>}
                  {!t.can_view_finance && !t.can_publish_results && !t.can_issue_certificates && (
                    <span className="text-xs text-stone-400">Basic</span>
                  )}
                </div>
              </TD>
              <TD>
                <Badge tone={t.is_active ? "green" : "stone"}>
                  {t.is_active ? "Active" : "Inactive"}
                </Badge>
              </TD>
              <TD className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditTarget(t);
                    setEditForm(t);
                  }}
                >
                  <Settings2 className="h-4 w-4" /> Edit
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {teachers.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No teachers yet. Add one to get started.</p>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add teacher"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={pending === "create"} onClick={create}>
              Create teacher
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="t_name">
              <Input
                id="t_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Email" htmlFor="t_email">
              <Input
                id="t_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone" htmlFor="t_phone">
              <Input
                id="t_phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Temporary password" htmlFor="t_password" hint="Minimum 8 characters">
              <Input
                id="t_password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
          </div>
          <PermissionsFields
            value={form}
            onChange={(patch) => setForm({ ...form, ...patch })}
          />
          <Field label="Remarks" htmlFor="t_remarks">
            <Textarea
              id="t_remarks"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit teacher"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button loading={pending === "edit"} onClick={saveEdit}>
              Save changes
            </Button>
          </>
        }
      >
        {editForm && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="e_name">
                <Input
                  id="e_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </Field>
              <Field label="Phone" htmlFor="e_phone">
                <Input
                  id="e_phone"
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </Field>
            </div>
            <PermissionsFields
              value={editForm}
              onChange={(patch) => setEditForm({ ...editForm, ...patch })}
            />
            <label className="flex items-center gap-2.5">
              <Checkbox
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
              <Label className="mb-0">Active</Label>
            </label>
            <Field label="Remarks" htmlFor="e_remarks">
              <Textarea
                id="e_remarks"
                rows={2}
                value={editForm.remarks ?? ""}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PermissionsFields({
  value,
  onChange,
}: {
  value: {
    can_view_finance: boolean;
    can_publish_results: boolean;
    can_issue_certificates: boolean;
  };
  onChange: (patch: Partial<{
    can_view_finance: boolean;
    can_publish_results: boolean;
    can_issue_certificates: boolean;
  }>) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-stone-200 p-4">
      <legend className="px-1 text-sm font-semibold text-stone-700">Permissions</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={value.can_view_finance}
            onChange={(e) => onChange({ can_view_finance: e.target.checked })}
          />
          <span className="text-sm text-stone-700">View finance</span>
        </label>
        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={value.can_publish_results}
            onChange={(e) => onChange({ can_publish_results: e.target.checked })}
          />
          <span className="text-sm text-stone-700">Publish results</span>
        </label>
        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={value.can_issue_certificates}
            onChange={(e) => onChange({ can_issue_certificates: e.target.checked })}
          />
          <span className="text-sm text-stone-700">Issue certificates</span>
        </label>
      </div>
    </fieldset>
  );
}