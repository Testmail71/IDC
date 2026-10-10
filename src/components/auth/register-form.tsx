"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ImageUp,
  PartyPopper,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { GENDERS, INDIAN_STATES } from "@/lib/constants";

type ClassNames = Record<string, string>;

export function RegisterForm({
  teachers,
  consentText,
}: {
  teachers: { id: string; full_name: string }[];
  consentText: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<ClassNames>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [photoName, setPhotoName] = React.useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const photoRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoName(null);
      setPhotoPreview(null);
      return;
    }
    setPhotoName(file.name);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});
    setWarnings([]);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: data,
      });
      const json = await res.json();

      if (!res.ok || json.ok === false) {
        if (json.fieldErrors) setFieldErrors(json.fieldErrors);
        if (json.error) setFormError(json.error);
        if (!json.error && !json.fieldErrors) {
          setFormError("Registration failed. Please try again.");
        }
        return;
      }
      setWarnings(json.warnings ?? []);
      setSuccess(json.registrationNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-bold text-emerald-900">
          Registration submitted
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Thank you. Your application is pending approval by the IDC administrator.
        </p>
        <div className="mt-6 inline-block rounded-xl border border-emerald-300 bg-white px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Your registration number
          </p>
          <p className="mt-1 text-2xl font-bold tracking-wide text-maroon-900">
            {success}
          </p>
        </div>
        <p className="mt-4 text-sm text-emerald-800">
          Please note this number down. You can log in with your email and password to
          track your approval status.
        </p>
        {warnings.length > 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
        <div className="mt-8">
          <Button href="/login" variant="maroon" size="lg">
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {formError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <Section title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *" htmlFor="full_name" error={fieldErrors.full_name}>
            <Input id="full_name" name="full_name" autoComplete="name" required />
          </Field>
          <Field label="Email address *" htmlFor="email" error={fieldErrors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Mobile number *" htmlFor="phone" error={fieldErrors.phone}>
            <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+91XXXXXXXXXX" required />
          </Field>
          <Field label="WhatsApp number" htmlFor="whatsapp" error={fieldErrors.whatsapp} hint="Leave blank if same as mobile.">
            <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="+91XXXXXXXXXX" />
          </Field>
          <Field label="Gender *" htmlFor="gender" error={fieldErrors.gender}>
            <Select id="gender" name="gender" required defaultValue="">
              <option value="" disabled>Select…</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full address *" htmlFor="address" error={fieldErrors.address}>
              <Textarea id="address" name="address" rows={2} required />
            </Field>
          </div>
          <Field label="City / Town *" htmlFor="city" error={fieldErrors.city}>
            <Input id="city" name="city" required />
          </Field>
          <Field label="District *" htmlFor="district" error={fieldErrors.district}>
            <Input id="district" name="district" required />
          </Field>
          <Field label="State *" htmlFor="state" error={fieldErrors.state}>
            <Select id="state" name="state" required defaultValue="">
              <option value="" disabled>Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="PIN code *" htmlFor="pincode" error={fieldErrors.pincode}>
            <Input id="pincode" name="pincode" inputMode="numeric" maxLength={6} required />
          </Field>
        </div>
      </Section>

      <Section title="Course & teacher">
        <Field
          label="Preferred teacher"
          htmlFor="teacher_id"
          error={fieldErrors.teacher_id}
          hint={teachers.length ? "Optional — the administrator confirms the final assignment." : "No teachers listed yet; the administrator will assign one."}
        >
          <Select id="teacher_id" name="teacher_id" defaultValue="" disabled={teachers.length === 0}>
            <option value="">No preference</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Photograph">
        <Field label="Passport-style photo *" htmlFor="photo" error={fieldErrors.photo}>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Photo preview" className="h-full w-full object-cover" />
              ) : (
                <ImageUp className="h-7 w-7 text-stone-400" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={photoRef}
                id="photo"
                name="photo"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={onPhotoChange}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                Choose photo
              </Button>
              {photoName && (
                <button
                  type="button"
                  onClick={() => {
                    if (photoRef.current) photoRef.current.value = "";
                    setPhotoName(null);
                    setPhotoPreview(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
              <p className="w-full text-xs text-stone-400">
                JPG or PNG. Clear face, plain background, under the size limit.
              </p>
            </div>
          </div>
        </Field>
      </Section>

      <Section title="Account">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password *" htmlFor="password" error={fieldErrors.password} hint="At least 8 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Confirm password *" htmlFor="confirm_password" error={fieldErrors.confirm_password}>
            <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
          </Field>
        </div>
        <label className="mt-5 flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            value="true"
            className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-saffron-600"
            required
          />
          <span className="text-sm text-stone-600">{consentText}</span>
        </label>
        {fieldErrors.consent && (
          <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.consent}</p>
        )}
      </Section>

      <div className="flex flex-col items-center gap-3 border-t border-stone-100 pt-6">
        <Button type="submit" size="lg" className="w-full sm:w-auto sm:px-10" loading={pending}>
          Submit registration
        </Button>
        <p className="text-sm text-stone-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-saffron-700 hover:text-saffron-800">
            Log in
          </Link>
        </p>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-maroon-800">
        <CheckCircle2 className="h-4 w-4 text-gold-500" />
        {title}
      </h2>
      <div className="rounded-xl border border-stone-200 bg-white p-5">{children}</div>
    </section>
  );
}