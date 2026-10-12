import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

/**
 * Public content pages are statically rendered and revalidated in the
 * background (ISR). Settings are read from a shared cache (see
 * `@/lib/settings-cache`), so the shell no longer depends on request cookies.
 * Pages that need per-request data (e.g. login) opt back in with their own
 * `dynamic = "force-dynamic"` export.
 */
export const revalidate = 300;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}