import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/idc-logo.png"
      alt="ISKCON Disciples Course"
      className={cn("h-10 w-10 object-contain", className)}
    />
  );
}

export function Logo({
  logoUrl,
  className,
  size = "md",
}: {
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" }[size];
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt="Temple logo"
        className={cn("object-contain", dims, className)}
      />
    );
  }
  return <LogoMark className={cn(dims, className)} />;
}

export function Brand({
  logoUrl,
  showSubtitle = false,
  light = false,
  size = "md",
}: {
  logoUrl?: string | null;
  showSubtitle?: boolean;
  light?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex items-center gap-3">
      <Logo logoUrl={logoUrl} size={size} />
      <div className="leading-tight">
        <p
          className={cn(
            "font-bold tracking-tight",
            size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-[22px]",
            light ? "text-white" : "text-maroon-900",
          )}
        >
          ISKCON Disciples Course
        </p>
        {showSubtitle && (
          <p
            className={cn(
              "mt-0.5 text-[11px] font-medium uppercase tracking-wide",
              light ? "text-gold-300" : "text-stone-500",
            )}
          >
            Registration · Examination · Payments · Certificates
          </p>
        )}
      </div>
    </div>
  );
}