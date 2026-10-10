import { signOutAction } from "@/actions/auth";
import { DashboardFrame } from "@/components/layout/dashboard-client";
import { cacheSettings } from "@/lib/settings-cache";
import {
  ADMIN_NAV,
  STUDENT_NAV,
  TEACHER_NAV,
  type NavItem,
} from "@/lib/constants";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const role = session.profile?.role ?? "student";

  const nav: NavItem[] =
    role === "admin" || role === "super_admin"
      ? ADMIN_NAV
      : role === "teacher"
        ? TEACHER_NAV
        : STUDENT_NAV;

  const settings = await cacheSettings();
  const logoUrl = settings.logoPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public-assets/${settings.logoPath}`
    : null;

  return (
    <DashboardFrame
      role={role}
      nav={nav}
      name={session.profile?.full_name ?? session.user.email ?? "User"}
      email={session.user.email ?? ""}
      logoUrl={logoUrl}
      onLogout={signOutAction}
    >
      {children}
    </DashboardFrame>
  );
}