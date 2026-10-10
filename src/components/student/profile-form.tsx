"use client";

import * as React from "react";
import { useActionState } from "react";
import { Camera } from "lucide-react";

import {
  setStudentPhotoPathAction,
  updateStudentProfileAction,
  type ActionResult,
} from "@/actions/student";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { BUCKETS, GENDERS, INDIAN_STATES } from "@/lib/constants";
import { uniqFileName } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";

export function ProfileForm({
  student,
  photoUrl,
  userId,
  maxPhotoMb,
}: {
  student: Student;
  photoUrl: string | null;
  userId: string;
  maxPhotoMb: number;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateStudentProfileAction,
    null,
  );
  const [uploading, setUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState(photoUrl);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoMsg(null);

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setPhotoError("Upload a JPG or PNG image.");
      return;
    }
    if (file.size > maxPhotoMb * 1024 * 1024) {
      setPhotoError(`Photo must be smaller than ${maxPhotoMb} MB.`);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/${uniqFileName(file.name)}`;
      const { error } = await supabase.storage
        .from(BUCKETS.photos)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;

      const res = await setStudentPhotoPathAction(path);
      if (res.error) throw new Error(res.error);

      const { data } = await supabase.storage
        .from(BUCKETS.photos)
        .createSignedUrl(path, 3600);
      if (data?.signedUrl) setPreview(data.signedUrl);
      setPhotoMsg("Photo updated successfully.");
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {state?.message && <Alert variant="success">{state.message}</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div className="flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-white p-6 sm:flex-row">
        <Avatar name={student.full_name} src={preview} size="xl" />
        <div className="text-center sm:text-left">
          <p className="font-semibold text-stone-900">{student.full_name}</p>
          <p className="text-sm text-stone-500">{student.registration_number}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={onPhoto}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {!uploading && <Camera className="h-4 w-4" />}
              Change photo
            </Button>
          </div>
          {photoError && <p className="mt-2 text-xs font-medium text-red-600">{photoError}</p>}
          {photoMsg && <p className="mt-2 text-xs font-medium text-emerald-600">{photoMsg}</p>}
        </div>
      </div>

      <form action={formAction} className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name" error={state?.fieldErrors?.full_name}>
            <Input id="full_name" name="full_name" defaultValue={student.full_name} required />
          </Field>
          <Field label="Email (read-only)" htmlFor="email_readonly">
            <Input id="email_readonly" value={student.email} readOnly disabled />
          </Field>
          <Field label="Mobile number" htmlFor="phone" error={state?.fieldErrors?.phone}>
            <Input id="phone" name="phone" defaultValue={student.phone} required />
          </Field>
          <Field label="WhatsApp number" htmlFor="whatsapp" error={state?.fieldErrors?.whatsapp}>
            <Input id="whatsapp" name="whatsapp" defaultValue={student.whatsapp ?? ""} />
          </Field>
          <Field label="Gender (fixed)" htmlFor="gender_readonly">
            <Select id="gender_readonly" defaultValue={student.gender ?? ""} disabled>
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <div className="sm:col-span-2">
            <Field label="Full address" htmlFor="address" error={state?.fieldErrors?.address}>
              <Textarea id="address" name="address" rows={2} defaultValue={student.address ?? ""} required />
            </Field>
          </div>
          <Field label="City / Town" htmlFor="city" error={state?.fieldErrors?.city}>
            <Input id="city" name="city" defaultValue={student.city ?? ""} required />
          </Field>
          <Field label="District" htmlFor="district" error={state?.fieldErrors?.district}>
            <Input id="district" name="district" defaultValue={student.district ?? ""} required />
          </Field>
          <Field label="State" htmlFor="state" error={state?.fieldErrors?.state}>
            <Select id="state" name="state" defaultValue={student.state ?? ""} required>
              <option value="" disabled>Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="PIN code" htmlFor="pincode" error={state?.fieldErrors?.pincode}>
            <Input id="pincode" name="pincode" defaultValue={student.pincode ?? ""} maxLength={6} required />
          </Field>
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-stone-100 pt-5">
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
          <p className="text-xs text-stone-400">
            Registration number, email and enrollment details are managed by the administrator.
          </p>
        </div>
      </form>
    </div>
  );
}