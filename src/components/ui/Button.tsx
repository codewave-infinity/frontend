import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-slate-950 hover:bg-brand-400 focus-visible:ring-brand-400 shadow-lg shadow-brand-500/20",
  secondary:
    "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-slate-400 ring-1 ring-slate-700",
  ghost:
    "bg-transparent text-slate-300 hover:bg-slate-800/60 focus-visible:ring-slate-500",
  danger:
    "bg-danger-500 text-white hover:bg-danger-400 focus-visible:ring-danger-400",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium",
        "transition focus:outline-none focus-visible:ring-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        STYLES[variant],
        className,
      )}
    />
  );
}
