import { InstallPwaButton } from "@/components/pwa/install-button";

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-maroon-950 text-stone-300">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-stone-400 sm:flex-row sm:px-6">
        <p>&copy; 2026 ISKCON Durgapur. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <InstallPwaButton
            variant="ghost"
            className="text-stone-400 hover:bg-white/10 hover:text-white"
          >
            Install Portal App
          </InstallPwaButton>
        </div>
      </div>
    </footer>
  );
}
