import { Activity, Shield, Network, BrainCircuit } from "lucide-react";
import type { ReactNode } from "react";

interface Stat {
  label: string;
  value: ReactNode;
  hint: string;
  icon: typeof Activity;
}

const STATS: Stat[] = [
  { label: "Reports today",         value: "—",  hint: "across the network", icon: Activity },
  { label: "Blocks across network", value: "—",  hint: "rolling 24h",        icon: Shield },
  { label: "Active gateways",       value: "—",  hint: "currently online",   icon: Network },
  { label: "FL global accuracy",    value: "—",  hint: "last round",         icon: BrainCircuit },
];

export function NetworkStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map(({ label, value, hint, icon: Icon }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
            <Icon className="h-3.5 w-3.5 text-brand-400" />
            {label}
          </div>
          <div className="mt-2 font-mono text-2xl text-slate-100">{value}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>
        </div>
      ))}
    </div>
  );
}
