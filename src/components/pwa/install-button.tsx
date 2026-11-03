"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { cn } from "@/lib/utils";

interface InstallButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
}

export function InstallPwaButton({
  className,
  variant = "outline",
  children,
  ...props
}: InstallButtonProps) {
  const [canInstall, setCanInstall] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Standalone check
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    const handlePrompt = () => setCanInstall(true);
    window.addEventListener("beforeinstallprompt", handlePrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  if (!canInstall) return null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    window.dispatchEvent(new CustomEvent("idc:install-pwa"));
    props.onClick?.(e);
  };

  const variantStyles = {
    primary: "bg-maroon-800 text-white hover:bg-maroon-900",
    outline: "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
    ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
  }[variant];

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-2",
        variantStyles,
        className,
      )}
      {...props}
    >
      <Download className="h-3.5 w-3.5" />
      {children || "Install App"}
    </button>
  );
}
