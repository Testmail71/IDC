import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "success" | "error" | "warning";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[variant];
  const Icon = {
    info: Info,
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
  }[variant];

  return (
    <div
      role="alert"
      className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm", styles, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-saffron-600", className)} aria-hidden />;
}

export function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}