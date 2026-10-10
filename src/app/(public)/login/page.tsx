import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/layout/brand";
import { getCurrentSession } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/constants";

export const metadata: Metadata = { title: "Student Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const session = await getCurrentSession();
  if (session?.profile) {
    redirect(dashboardPathForRole(session.profile.role));
  }

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
      <div className="hidden lg:block">
        <LogoMark className="h-14 w-14" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-stone-900">
          Welcome back
        </h1>
        <p className="mt-4 max-w-md leading-relaxed text-stone-600">
          Sign in to view your course progress, examination status, payments and
          certificate — all in one place.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-stone-600">
          <li>• Track your 12-class course progress</li>
          <li>• Download payment receipts and check your dues</li>
          <li>• Submit and monitor your examination status</li>
          <li>• Download your certificate once qualified</li>
        </ul>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 lg:hidden">
            <LogoMark className="mx-auto h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Student Login</h2>
          <p className="mt-1 mb-6 text-sm text-stone-500">
            Enter your registered email and password.
          </p>
          <LoginForm initialError={params.error} />
        </div>
        <p className="mt-6 text-center text-xs text-stone-400">
          Administrators and teachers also sign in here.
        </p>
        <p className="mt-2 text-center text-xs text-stone-400">
          Need help?{" "}
          <Link href="/contact" className="underline hover:text-stone-600">
            Contact the IDC department
          </Link>
        </p>
      </div>
    </div>
  );
}