import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { createClient } from "@/lib/supabase/server";
import { cacheSettings } from "@/lib/settings-cache";

export const metadata: Metadata = { title: "Student Registration" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const settings = await cacheSettings();

  let teachers: { id: string; full_name: string }[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("teachers_public")
      .select("id, full_name")
      .order("full_name");
    teachers = data ?? [];
  } catch {
    teachers = [];
  }

  const consentText = `I confirm that the information provided is correct and consent to ${settings.templeName} processing my details for the purpose of the ISKCON Disciples Course.`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-600">
        Admissions
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">
        Student Registration
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Complete the form below to apply for the ISKCON Disciples Course. Fields marked
        with * are required. Your application will be reviewed by the IDC administrator.
      </p>

      {!settings.registrationOpen && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Registration is currently closed. You may submit the form, but approval will
          be processed when registration reopens.
        </div>
      )}

      <div className="mt-10">
        <RegisterForm teachers={teachers} consentText={consentText} />
      </div>
    </div>
  );
}