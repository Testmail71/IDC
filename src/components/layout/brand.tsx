import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn("h-10 w-10", className)}
    >
      <circle cx="24" cy="24" r="22" className="fill-maroon-800" />
      <circle cx="24" cy="24" r="22" stroke="rgba(201,150,46,0.8)" strokeWidth="1.5" />
      {/* Lotus petals */}
      <path
        d="M24 29c-4-1.5-6.8 0.6-9 2.4 1-5 4.4-8.4 9-8.4s8 3.4 9 8.4c-2.2-1.8-5-3.9-9-2.4Z"
        fill="#f97316"
      />
      <path
        d="M24 20c-3.2-1.2-5.5 0.5-7.3 1.9.8-4 3.6-6.7 7.3-6.7s6.5 2.7 7.3 6.7C29.5 20.5 27.2 18.8 24 20Z"
        fill="#fb923c"
      />
      <circle cx="24" cy="24" r="2.4" fill="#fbbf24" />
    </svg>
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
            size === "lg" ? "text-xl" : "text-base",
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