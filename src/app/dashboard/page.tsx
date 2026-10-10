import { redirect } from "next/navigation";

import { dashboardPathForRole } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const session = await requireAuth();
  redirect(dashboardPathForRole(session.profile?.role ?? null));
}