import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, FileCode2, Radar } from "lucide-react";
import type { ThreatReport } from "@/types/contracts";
import { api } from "@/lib/api";
import { subscribeFeed } from "@/lib/ws";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SigmaRuleModal } from "@/components/SigmaRuleModal";
import { cn, severityColor, timeAgo } from "@/lib/utils";

interface ClusterRipple {
  seedId: string;
  count: number;
  at: number;
}

export function ThreatFeed() {
  const initial = useQuery({
    queryKey: ["threats", "feed"],
    queryFn: () => api.threatFeed(),
  });

  const [reports, setReports] = useState<ThreatReport[]>([]);
  const [ripples, setRipples] = useState<Record<string, ClusterRipple>>({});
  const [openRule, setOpenRule] = useState<{ id: string; yaml: string } | null>(null);

  // Hydrate from initial fetch.
  useEffect(() => {
    if (initial.data) setReports(initial.data.reports);
  }, [initial.data]);

  // Subscribe to live updates.
  useEffect(() => {
    const sub = subscribeFeed((e) => {
      if (e.kind === "report") {
        setReports((prev) => {
          if (prev.some((r) => r.reportId === e.report.reportId)) return prev;
          return [e.report, ...prev].slice(0, 100);
        });
      } else if (e.kind === "cluster") {
        setRipples((prev) => ({
          ...prev,
          [e.seedId]: { seedId: e.seedId, count: e.members.length, at: Date.now() },
        }));
        window.setTimeout(() => {
          setRipples((prev) => {
            const next = { ...prev };
            delete next[e.seedId];
            return next;
          });
        }, 4500);
      }
    });
    return () => sub.close();
  }, []);

  return (
    <>
      <Card
        title="Live threat feed"
        subtitle="New reports appear in real time. Cluster expansion ripples animate when GNN propagates a block."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2 py-1 text-[11px] uppercase tracking-wider text-brand-300 ring-1 ring-brand-500/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
            live
          </span>
        }
      >
        {initial.isLoading && (
          <div className="text-sm text-slate-400">Loading feed…</div>
        )}
        {initial.isError && (
          <div className="text-sm text-danger-400">Couldn't load feed.</div>
        )}

        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {reports.map((r) => {
              const ripple = ripples[r.reportId];
              return (
                <motion.li
                  key={r.reportId}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className={cn(
                    "relative rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3",
                    "hover:border-slate-700",
                  )}
                >
                  {ripple && (
                    <motion.span
                      key={ripple.at}
                      initial={{ opacity: 0.7, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.6 }}
                      transition={{ duration: 1.6, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-brand-400/60"
                    />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-slate-300">
                          Bank #{r.anonymousReporter}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{timeAgo(r.createdAt)}</span>
                        <span aria-hidden>·</span>
                        <Badge className={cn(severityColor(r.severity), "uppercase")}>
                          {r.severity}
                        </Badge>
                        <Badge className="bg-slate-800/60 text-slate-300 ring-slate-700/60">
                          {r.type}
                        </Badge>
                      </div>

                      <div className="mt-1.5 space-y-1">
                        {r.indicators.map((ind, i) => (
                          <div
                            key={`${r.reportId}-${i}`}
                            className="flex items-center gap-2 font-mono text-sm text-slate-100"
                          >
                            <Globe className="h-3.5 w-3.5 text-brand-400" />
                            <span className="truncate">{ind.value}</span>
                            <span className="text-[11px] uppercase text-slate-500">
                              {ind.type}
                            </span>
                          </div>
                        ))}
                      </div>

                      {r.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">
                          {r.description}
                        </p>
                      )}

                      {ripple && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-brand-300">
                          <Radar className="h-3 w-3 animate-pulse" />
                          GNN expanded · {ripple.count} related indicators blocked
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setOpenRule({
                          id: "sig_" + r.reportId,
                          yaml: previewYaml(r),
                        })
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 ring-1 ring-slate-800 hover:bg-slate-800/60 hover:text-slate-100"
                    >
                      <FileCode2 className="h-3.5 w-3.5" />
                      View Sigma
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {reports.length === 0 && !initial.isLoading && (
          <div className="py-10 text-center text-sm text-slate-500">
            No reports yet. Submit one on the right and watch it land here.
          </div>
        )}
      </Card>

      <SigmaRuleModal
        open={openRule !== null}
        onClose={() => setOpenRule(null)}
        ruleId={openRule?.id ?? ""}
        yaml={openRule?.yaml ?? ""}
      />
    </>
  );
}

function previewYaml(r: ThreatReport): string {
  const ind = r.indicators[0];
  const credBucket = r.credibility >= 0.7 ? "high" : r.credibility >= 0.4 ? "medium" : "low";
  return `title: SecureShare Auto Rule — ${ind?.value ?? "unknown"}
id: sig_${r.reportId}
status: experimental
description: Auto-generated from threat report ${r.reportId}.
references:
  - secureshare://reports/${r.reportId}
date: ${r.createdAt.slice(0, 10)}
logsource:
  product: dns
  category: query
detection:
  selection:
    query: "${ind?.value ?? "unknown"}"
  condition: selection
level: ${r.severity}
tags:
  - secureshare.auto
  - secureshare.indicator.${ind?.type ?? "domain"}
  - secureshare.credibility.${credBucket}
`;
}
