import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

export interface AuthSession {
  user: {
    id: string;
    email: string | undefined;
  };
  profile: {
    id: string;
    role: UserRole;
    full_name: string;
    email: string;
    is_active: boolean;
  } | null;
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isTeacherRole(role: UserRole | null | undefined): boolean {
  return role === "teacher";
}

/** Resolve the current session plus profile. Wrapped in React cache. */
export const getCurrentSession = cache(
  async (): Promise<AuthSession | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name, email, is_active")
      .eq("id", user.id)
      .maybeSingle();

    return {
      user: { id: user.id, email: user.email },
      profile,
    };
  },
);

/**
 * Redirect to /login if there is no session. Returns the session.
 * Also bounces inactive users.
 */
export async function requireAuth(): Promise<NonNullable<AuthSession>> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.profile && !session.profile.is_active) {
    redirect("/login?error=" + encodeURIComponent("account_disabled"));
  }
  return session as NonNullable<AuthSession>;
}

/**
 * Require one of the given roles, otherwise redirect to the user's own
 * dashboard (or login when unauthenticated).
 */
export async function requireRole(
  roles: UserRole[],
): Promise<NonNullable<AuthSession>> {
  const session = await requireAuth();
  if (!session.profile) {
    // No profile yet - bounce to the auth pages.
    redirect("/login");
  }
  if (!roles.includes(session.profile.role)) {
    redirect(dashboardPathForRole(session.profile.role));
  }
  return session;
}

export async function requireStudent(): Promise<NonNullable<AuthSession>> {
  return requireRole(["student"]);
}

export async function requireTeacher(): Promise<NonNullable<AuthSession>> {
  return requireRole(["teacher"]);
}

export async function requireAdmin(): Promise<NonNullable<AuthSession>> {
  return requireRole(["admin", "super_admin"]);
}

export async function requireSuperAdmin(): Promise<NonNullable<AuthSession>> {
  return requireRole(["super_admin"]);
}