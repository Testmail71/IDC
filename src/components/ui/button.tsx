import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "maroon"
  | "gold"
  | "outline"
  | "ghost"
  | "danger"
  | "subtle";

type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-saffron-600 text-white hover:bg-saffron-700 shadow-sm disabled:bg-saffron-300",
  maroon:
    "bg-maroon-800 text-white hover:bg-maroon-900 shadow-sm disabled:bg-maroon-300",
  gold:
    "bg-gold-500 text-maroon-950 hover:bg-gold-600 shadow-sm disabled:bg-gold-200",
  outline:
    "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-400",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
  danger: "bg-red-700 text-white hover:bg-red-800 shadow-sm disabled:bg-red-300",
  subtle:
    "bg-saffron-50 text-saffron-700 hover:bg-saffron-100 disabled:bg-saffron-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, href, children, disabled, ...props },
    ref,
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
      "disabled:pointer-events-none disabled:opacity-70",
      "focus-visible:outline-none",
      variants[variant],
      sizes[size],
      className,
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";