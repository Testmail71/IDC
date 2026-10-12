import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { PublicNav } from "@/components/layout/public-nav";
import { cacheSettings } from "@/lib/settings-cache";

export async function PublicHeader() {
  const typed = await cacheSettings();
  const logoUrl = typed.logoPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public-assets/${typed.logoPath}`
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Home">
          <Brand logoUrl={logoUrl} />
        </Link>
        <PublicNav />
      </div>
    </header>
  );
}