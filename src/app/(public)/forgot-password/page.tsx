import type { Metadata } from "next";
import { LogoMark } from "@/components/layout/brand";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-center text-2xl font-bold text-stone-900">
          Forgot your password?
        </h1>
        <p className="mt-2 mb-6 text-center text-sm text-stone-500">
          Enter the email you registered with and we will send you a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}