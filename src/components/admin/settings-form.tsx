"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, ImageUp, Save } from "lucide-react";

import { saveLogoAction, updateSettingsAction } from "@/actions/settings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Label, Textarea } from "@/components/ui/input";
import { BUCKETS } from "@/lib/constants";
import { uniqFileName } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export interface SettingsFormValues {
  temple_name: string;
  idc_center_name: string;
  logo_path: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  public_disclose_student_name: boolean;
  require_payment_before_certificate: boolean;
  allow_exam_without_completion: boolean;
  registration_open: boolean;
  student_photo_limit_mb: number;
  exam_sheet_limit_mb: number;
  certificate_limit_mb: number;
  homepage_intro: string;
  disclaimer: string;
}

export function SettingsForm({
  initial,
  logoUrl,
}: {
  initial: SettingsFormValues;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: "error" | "success"; text: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function save() {
    setPending("save");
    setMessage(null);
    const res = await updateSettingsAction({
      temple_name: form.temple_name,
      idc_center_name: form.idc_center_name,
      logo_path: form.logo_path,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      contact_address: form.contact_address,
      public_disclose_student_name: form.public_disclose_student_name,
      require_payment_before_certificate: form.require_payment_before_certificate,
      allow_exam_without_completion: form.allow_exam_without_completion,
      registration_open: form.registration_open,
      student_photo_limit_mb: form.student_photo_limit_mb,
      exam_sheet_limit_mb: form.exam_sheet_limit_mb,
      certificate_limit_mb: form.certificate_limit_mb,
      homepage_intro: form.homepage_intro,
      disclaimer: form.disclaimer,
    });
    setPending(null);
    if (res.error) return setMessage({ type: "error", text: res.error });
    setMessage({ type: "success", text: res.message ?? "Saved." });
    router.refresh();
  }

  async function uploadLogo() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMessage({ type: "error", text: "Choose an image file first." });
    setPending("logo");
    setMessage(null);
    try {
      const supabase = createClient();
      const path = `logo/${uniqFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.publicAssets)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const res = await saveLogoAction(path);
      if (res.error) throw new Error(res.error);
      setForm((f) => ({ ...f, logo_path: path }));
      setMessage({ type: "success", text: res.message ?? "Logo updated." });
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Organisation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Temple name" htmlFor="temple_name">
            <Input
              id="temple_name"
              value={form.temple_name}
              onChange={(e) => setForm({ ...form, temple_name: e.target.value })}
            />
          </Field>
          <Field label="IDC centre name" htmlFor="idc_center_name">
            <Input
              id="idc_center_name"
              value={form.idc_center_name}
              onChange={(e) => setForm({ ...form, idc_center_name: e.target.value })}
            />
          </Field>
          <Field label="Contact email" htmlFor="contact_email">
            <Input
              id="contact_email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            />
          </Field>
          <Field label="Contact phone" htmlFor="contact_phone">
            <Input
              id="contact_phone"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Contact address" htmlFor="contact_address">
              <Textarea
                id="contact_address"
                rows={2}
                value={form.contact_address}
                onChange={(e) => setForm({ ...form, contact_address: e.target.value })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portal logo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <ImageUp className="h-8 w-8 text-stone-300" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={() => undefined}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageUp className="h-4 w-4" /> Choose image
            </Button>
            <Button type="button" loading={pending === "logo"} onClick={uploadLogo}>
              Upload logo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration &amp; workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2.5">
              <Checkbox
                checked={form.registration_open}
                onChange={(e) => setForm({ ...form, registration_open: e.target.checked })}
              />
              <Label className="mb-0">Registration open</Label>
            </label>
            <label className="flex items-center gap-2.5">
              <Checkbox
                checked={form.public_disclose_student_name}
                onChange={(e) =>
                  setForm({ ...form, public_disclose_student_name: e.target.checked })
                }
              />
              <Label className="mb-0">Show student name on public verification</Label>
            </label>
            <label className="flex items-center gap-2.5">
              <Checkbox
                checked={form.require_payment_before_certificate}
                onChange={(e) =>
                  setForm({ ...form, require_payment_before_certificate: e.target.checked })
                }
              />
              <Label className="mb-0">Require full payment before certificate</Label>
            </label>
            <label className="flex items-center gap-2.5">
              <Checkbox
                checked={form.allow_exam_without_completion}
                onChange={(e) =>
                  setForm({ ...form, allow_exam_without_completion: e.target.checked })
                }
              />
              <Label className="mb-0">Allow exam without course completion</Label>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Photo limit (MB)" htmlFor="student_photo_limit_mb">
              <Input
                id="student_photo_limit_mb"
                type="number"
                min={1}
                value={form.student_photo_limit_mb}
                onChange={(e) => setForm({ ...form, student_photo_limit_mb: Number(e.target.value) })}
              />
            </Field>
            <Field label="Exam sheet limit (MB)" htmlFor="exam_sheet_limit_mb">
              <Input
                id="exam_sheet_limit_mb"
                type="number"
                min={1}
                value={form.exam_sheet_limit_mb}
                onChange={(e) => setForm({ ...form, exam_sheet_limit_mb: Number(e.target.value) })}
              />
            </Field>
            <Field label="Certificate limit (MB)" htmlFor="certificate_limit_mb">
              <Input
                id="certificate_limit_mb"
                type="number"
                min={1}
                value={form.certificate_limit_mb}
                onChange={(e) => setForm({ ...form, certificate_limit_mb: Number(e.target.value) })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homepage content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Homepage introduction" htmlFor="homepage_intro">
            <Textarea
              id="homepage_intro"
              rows={4}
              value={form.homepage_intro}
              onChange={(e) => setForm({ ...form, homepage_intro: e.target.value })}
            />
          </Field>
          <Field label="Disclaimer" htmlFor="disclaimer">
            <Textarea
              id="disclaimer"
              rows={3}
              value={form.disclaimer}
              onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} loading={pending === "save"} size="lg">
          <Save className="h-4 w-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}