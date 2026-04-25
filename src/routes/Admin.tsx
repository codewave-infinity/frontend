import { Card } from "@/components/ui/Card";

export default function Admin() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aggregate stats, FL accuracy over time, and the problem-sharing feed
          will live here. Stub for now.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Aggregate stats" subtitle="Coming soon">
          <p className="text-sm text-slate-400">
            Total reports, blocks across the network, and per-org confirmations.
          </p>
        </Card>
        <Card title="FL accuracy over time" subtitle="Coming soon">
          <p className="text-sm text-slate-400">
            Time series of global model accuracy across federated rounds.
          </p>
        </Card>
        <Card title="Problem-sharing feed" subtitle="Coming soon" className="md:col-span-2">
          <p className="text-sm text-slate-400">
            Anonymized incident write-ups tagged with MITRE ATT&CK, separate
            from the IOC-only feed.
          </p>
        </Card>
      </div>
    </div>
  );
}
