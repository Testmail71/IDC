import type { Metadata } from "next";

import { OfflineView } from "@/components/pwa/offline-view";

export const metadata: Metadata = {
  title: "Offline | ISKCON Disciples Course",
  description: "You are currently offline. Check your internet connection.",
};

export default function OfflinePage() {
  return <OfflineView />;
}
