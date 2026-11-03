"use client";

import * as React from "react";
import { Download, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaClient() {
  const [installPrompt, setInstallPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(true);
  const [isOffline, setIsOffline] = React.useState(false);
  const [onlineAlert, setOnlineAlert] = React.useState(false);

  // Register service worker and listen for network/display changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    // Initial dismissal check from localStorage (suppress for 5 days if dismissed)
    try {
      const dismissedUntil = localStorage.getItem("idc_pwa_dismissed_until");
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    // New content is available; post skip waiting
                    installingWorker.postMessage({ type: "SKIP_WAITING" });
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("[PWA] Service worker registration failed:", err);
          });
      });
    }

    // Capture install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Custom event to trigger install from elsewhere in the app
    const handleCustomInstall = () => {
      if (installPrompt) {
        installPrompt.prompt();
      }
    };
    window.addEventListener("idc:install-pwa", handleCustomInstall);

    // Network status listeners
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setOnlineAlert(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setOnlineAlert(true);
      const timer = setTimeout(() => setOnlineAlert(false), 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("idc:install-pwa", handleCustomInstall);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [installPrompt]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      // Dismiss for 5 days
      localStorage.setItem(
        "idc_pwa_dismissed_until",
        String(Date.now() + 5 * 24 * 60 * 60 * 1000),
      );
    } catch {
      // ignore storage errors
    }
  };

  return (
    <>
      {/* Offline Toast Banner */}
      {isOffline && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 shadow-lg sm:left-auto sm:right-6">
          <div className="flex items-center gap-2.5">
            <WifiOff className="h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1 text-xs sm:text-sm">
              <p className="font-semibold">You are currently offline</p>
              <p className="text-amber-800">
                You can continue browsing cached pages.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Back Online Toast */}
      {onlineAlert && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-emerald-900 shadow-lg sm:left-auto sm:right-6">
          <p className="text-xs font-semibold sm:text-sm">
            ✓ Back online. Network connection restored.
          </p>
        </div>
      )}

      {/* PWA Install Promotion Banner */}
      {!isStandalone && installPrompt && !isDismissed && (
        <aside
          aria-label="Install app"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all sm:bottom-6 sm:left-auto sm:right-6"
        >
          <div className="flex items-start gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-96x96.png"
              alt="IDC Logo"
              className="h-11 w-11 rounded-xl border border-stone-100 object-contain shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-stone-900">
                Install IDC Portal App
              </h2>
              <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                Add to your home screen or desktop for instant access, smooth
                navigation, and offline capabilities.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-maroon-900 focus-visible:outline-2 focus-visible:outline-maroon-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install App
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
