import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "saffron",
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "saffron" | "maroon" | "gold" | "green" | "red" | "stone";
  sub?: string;
  className?: string;
}) {
  const tones = {
    saffron: "bg-saffron-100 text-saffron-700",
    maroon: "bg-maroon-100 text-maroon-800",
    gold: "bg-gold-100 text-gold-600",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    stone: "bg-stone-100 text-stone-600",
  }[tone];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-stone-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
        </div>
        {icon && (
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              tones,
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}