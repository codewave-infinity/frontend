import { Card } from "@/components/ui/Card";
import { NetworkStats } from "@/components/NetworkStats";
import { ThreatFeed } from "@/components/ThreatFeed";
import { ThreatReportForm } from "@/components/ThreatReportForm";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">Live Network</h1>
        <p className="mt-1 text-sm text-slate-400">
          Anonymous, signed threat intelligence — flowing across every gateway in real time.
        </p>
      </header>

      <NetworkStats />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ThreatFeed />

        <div className="space-y-6">
          <ThreatReportForm />

          <Card title="Credibility" subtitle="Coming soon">
            <p className="text-sm text-slate-400">
              Reliability bar chart and top contributors will land here once the
              backend telemetry endpoint is online.
            </p>
          </Card>

          <Card title="Cluster expansion" subtitle="Coming soon">
            <p className="text-sm text-slate-400">
              GNN-driven force-directed graph showing the malicious infrastructure
              cluster around the most recent report — wiring this in once the
              <span className="font-mono"> /gnn/cluster </span>endpoint is reachable.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
