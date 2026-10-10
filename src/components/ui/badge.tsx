import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  saffron: "bg-saffron-100 text-saffron-800 border-saffron-200",
  maroon: "bg-maroon-100 text-maroon-800 border-maroon-200",
  gold: "bg-gold-100 text-gold-700 border-gold-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  red: "bg-red-100 text-red-700 border-red-200",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
  blue: "bg-sky-100 text-sky-800 border-sky-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
} as const;

export type Tone = keyof typeof tones;

export function Badge({
  tone = "stone",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}