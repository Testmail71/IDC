import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { cacheSettings } from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

export async function PublicFooter() {
  const typed = await cacheSettings();
  const logoUrl = typed.logoPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public-assets/${typed.logoPath}`
    : null;

  return (
    <footer className="mt-auto bg-maroon-950 text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Brand logoUrl={logoUrl} light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-400">
            {typed.homepageIntro || "Deepening students' understanding of Srila Prabhupada's books, Krsna consciousness and the guru-discipline process."}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-300">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/">Home</Link></li>
            <li><Link className="hover:text-white" href="/about">About IDC</Link></li>
            <li><Link className="hover:text-white" href="/register">Student Registration</Link></li>
            <li><Link className="hover:text-white" href="/login">Student Login</Link></li>
            <li><Link className="hover:text-white" href="/verify">Certificate Verification</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-300">
            Contact
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-stone-400">
            <li>{typed.templeName || "ISKCON Temple"}</li>
            {typed.centerName && <li>{typed.centerName}</li>}
            {typed.contactAddress && <li className="whitespace-pre-line">{typed.contactAddress}</li>}
            {typed.contactPhone && <li>Phone: {typed.contactPhone}</li>}
            {typed.contactEmail && (
              <li>
                <a href={`mailto:${typed.contactEmail}`} className="hover:text-white">
                  {typed.contactEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-stone-500 sm:flex-row sm:px-6">
          <p>
            &copy; {new Date().getFullYear()} ISKCON Disciples Course. All rights reserved.
          </p>
          {typed.disclaimer && <p className="max-w-xl text-center sm:text-right">{typed.disclaimer}</p>}
        </div>
      </div>
    </footer>
  );
}