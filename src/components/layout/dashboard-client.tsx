"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileBadge,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Settings,
  Shield,
  Users,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  profile: UserRound,
  progress: ListChecks,
  exam: ClipboardCheck,
  payments: CreditCard,
  certificate: FileBadge,
  notifications: Bell,
  "change-password": Lock,
  students: Users,
  registrations: FileText,
  teachers: GraduationCap,
  fees: Wallet,
  dues: Wallet,
  refunds: Wallet,
  reports: FileText,
  audit: Shield,
  settings: Settings,
  exams: ClipboardCheck,
  certificates: FileBadge,
  books: BookOpen,
};

function navIcon(href: string) {
  const key = href.split("/").pop() ?? "";
  return ICONS[key] ?? Home;
}

export function DashboardSidebar({
  role,
  nav,
  logoUrl,
  open,
  onClose,
}: {
  role: string;
  nav: { href: string; label: string }[];
  logoUrl?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-stone-950/50 backdrop-blur-sm lg:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-maroon-900 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Brand logoUrl={logoUrl ?? null} light size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gold-300/80">
            {role === "admin" || role === "super_admin" ? "Administration" : role === "teacher" ? "Teacher" : "Student"}
          </p>
          <ul className="space-y-1">
            {nav.map((item) => {
              const Icon = navIcon(item.href);
              const active =
                item.href === "/student" || item.href === "/teacher" || item.href === "/admin"
                  ? pathname === item.href
                  : pathname.startsWith(item.href) || pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-saffron-600 text-white shadow-sm"
                        : "text-stone-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            View Public Site
          </Link>
        </div>
      </aside>
    </>
  );
}

export function DashboardTopbar({
  nav,
  name,
  email,
  role,
  avatarUrl,
  onOpenSidebar,
  onLogout,
}: {
  nav: { href: string; label: string }[];
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  onOpenSidebar: () => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student";
  const title =
    (role === "admin" || role === "super_admin")
      ? roleLabel === "Super Admin" ? "Super Admin" : "Administrator"
      : roleLabel;

  const activeItem =
    nav.find(
      (item) =>
        (item.href === "/student" || item.href === "/teacher" || item.href === "/admin"
          ? pathname === item.href
          : pathname.startsWith(item.href)) && item.href !== "/student/change-password",
    ) ?? nav.find((item) => item.href === "/student" || item.href === "/teacher" || item.href === "/admin");

  const pageTitle =
    pathname.endsWith("/change-password")
      ? "Change Password"
      : activeItem?.label ?? title;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-sm font-semibold text-stone-900 sm:text-base">{pageTitle}</h1>
          <p className="hidden text-xs text-stone-500 sm:block">
            {roleLabel}
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-stone-100"
        >
          <Avatar name={name} src={avatarUrl} size="sm" />
          <span className="hidden text-left sm:block">
            <span className="block max-w-[160px] truncate text-sm font-medium text-stone-800">
              {name}
            </span>
            <span className="block text-xs text-stone-400">{roleLabel}</span>
          </span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
              <div className="border-b border-stone-100 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-stone-900">{name}</p>
                <p className="truncate text-xs text-stone-500">{email}</p>
                <span className="mt-1.5 inline-flex rounded-full bg-saffron-100 px-2 py-0.5 text-[11px] font-semibold text-saffron-700">
                  {roleLabel}
                </span>
              </div>
              <div className="py-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Quick links
                </p>
                {nav.slice(0, 4).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-stone-100 px-3 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function DashboardFrame({
  role,
  nav,
  name,
  email,
  logoUrl,
  avatarUrl,
  onLogout,
  children,
}: {
  role: string;
  nav: NavItem[];
  name: string;
  email: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50">
      <DashboardSidebar
        role={role}
        nav={nav}
        logoUrl={logoUrl}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          nav={nav}
          name={name}
          email={email}
          role={role}
          avatarUrl={avatarUrl}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={onLogout}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}