"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";

export function NotificationList({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const unread = notifications.filter((n) => !n.is_read).length;

  async function handleOpen(n: Notification) {
    if (!n.is_read) {
      await markNotificationReadAction(n.id);
    }
    if (n.link) router.push(n.link);
    else router.refresh();
  }

  async function markAll() {
    setPending(true);
    try {
      await markAllNotificationsReadAction();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "You're all caught up."}
        </p>
        {unread > 0 && (
          <Button variant="outline" size="sm" loading={pending} onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-stone-200 bg-white py-16 text-center">
          <Bell className="h-8 w-8 text-stone-300" />
          <p className="mt-3 font-medium text-stone-600">No notifications yet</p>
          <p className="mt-1 text-sm text-stone-400">
            Important updates about your course, payments and examinations will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleOpen(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors hover:bg-stone-50",
                  n.is_read ? "border-stone-200 bg-white" : "border-saffron-200 bg-saffron-50/60",
                )}
              >
                <span
                  className={cn(
                    "mt-1 inline-block h-2 w-2 shrink-0 rounded-full",
                    n.is_read ? "bg-stone-300" : "bg-saffron-500",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm", n.is_read ? "font-medium text-stone-700" : "font-semibold text-stone-900")}>
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-stone-400">
                      {formatDateTime(n.created_at)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-500">{n.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}