"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export function OfflineView() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" aria-label="Home">
            <Brand />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            <WifiOff className="h-3.5 w-3.5" />
            Offline Mode
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon-50 text-maroon-800">
            <WifiOff className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            You are currently offline
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
            It looks like your device is disconnected from the internet. You can
            still view pages you have previously visited on this device.
          </p>

          <div className="mt-6 rounded-xl border border-stone-100 bg-stone-50 p-4 text-left text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Offline App Capabilities:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Previously cached course pages and dashboard views remain accessible.</li>
              <li>New submissions (such as exam uploads or payments) require an active internet connection.</li>
              <li>Your progress and state will automatically reconnect once back online.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button
              href="/"
              variant="outline"
              className="inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to Home
            </Button>
            <Button
              onClick={handleReload}
              variant="primary"
              className="inline-flex items-center justify-center gap-2 bg-saffron-600 hover:bg-saffron-700"
            >
              <RefreshCw className="h-4 w-4" />
              Check Connection
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        ISKCON Disciples Course Portal &bull; Progressive Web App
      </footer>
    </div>
  );
}
