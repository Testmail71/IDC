import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  tone?: "saffron" | "green" | "maroon" | "gold" | "red";
}

const TONES = {
  saffron: "bg-saffron-500",
  green: "bg-emerald-500",
  maroon: "bg-maroon-700",
  gold: "bg-gold-500",
  red: "bg-red-500",
};

export function SimpleBarChart({
  data,
  formatValue,
  className,
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-stone-600">{d.label}</span>
            <span className="text-stone-500">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className={cn("h-full rounded-full", TONES[d.tone ?? "saffron"])}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}