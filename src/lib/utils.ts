import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function shortAnonId(id: string): string {
  return `Bank #${id.slice(0, 4).toUpperCase()}`;
}

export function severityColor(s: string): string {
  switch (s) {
    case "critical": return "bg-danger-600/20 text-danger-400 ring-danger-500/30";
    case "high":     return "bg-danger-500/15 text-danger-400 ring-danger-500/30";
    case "medium":   return "bg-warn-500/15 text-warn-400 ring-warn-500/30";
    case "low":      return "bg-brand-500/15 text-brand-300 ring-brand-500/30";
    default:         return "bg-slate-500/15 text-slate-300 ring-slate-500/30";
  }
}
