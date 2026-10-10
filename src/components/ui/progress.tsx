import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  tone = "saffron",
  className,
}: {
  value: number;
  max?: number;
  tone?: "saffron" | "gold" | "green" | "maroon";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const tones = {
    saffron: "bg-saffron-500",
    gold: "bg-gold-500",
    green: "bg-emerald-500",
    maroon: "bg-maroon-700",
  }[tone];

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-stone-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}