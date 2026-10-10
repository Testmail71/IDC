import type { Metadata } from "next";

import { VerifyForm } from "@/components/public/verify-form";

export const metadata: Metadata = { title: "Certificate Verification" };

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-600">
        Registry
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">
        Certificate Verification
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Enter a certificate number to confirm that it was issued by the ISKCON
        Disciples Course department and is currently valid.
      </p>
      <div className="mt-10">
        <VerifyForm />
      </div>
    </div>
  );
}