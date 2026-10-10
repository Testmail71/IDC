"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About IDC" },
  { href: "/contact", label: "Contact" },
  { href: "/verify", label: "Certificate Verification" },
];

export function PublicNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <nav className="hidden items-center gap-1 lg:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-maroon-800",
              pathname === link.href && "text-maroon-800",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-2 lg:flex">
        <Link
          href="/login"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Student Login
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-700"
        >
          Register
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 border-t border-stone-100 bg-white shadow-lg lg:hidden">
          <div className="flex flex-col gap-1 p-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-stone-100 pt-4">
              <Link
                href="/login"
                className="rounded-lg border border-stone-300 px-4 py-2.5 text-center text-sm font-semibold text-stone-700"
              >
                Student Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-saffron-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}