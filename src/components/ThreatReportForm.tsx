import { useState } from "react";
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Indicator,
  IndicatorType,
  Severity,
  ThreatReportRequest,
  ThreatType,
} from "@/types/contracts";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";

const THREAT_TYPES: ThreatType[] = ["phishing", "malware", "ddos", "c2"];
const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const INDICATOR_TYPES: IndicatorType[] = [
  "domain",
  "ipv4",
  "url",
  "file_hash",
  "ja4",
  "email_sender",
];

// Common MITRE ATT&CK tactic IDs — the form takes the tactic id only.
const MITRE_TACTICS = [
  ["",         "— optional —"],
  ["TA0001",   "Initial Access"],
  ["TA0002",   "Execution"],
  ["TA0003",   "Persistence"],
  ["TA0007",   "Discovery"],
  ["TA0008",   "Lateral Movement"],
  ["TA0009",   "Collection"],
  ["TA0010",   "Exfiltration"],
  ["TA0011",   "Command and Control"],
  ["TA0040",   "Impact"],
] as const;

interface DraftIndicator {
  type: IndicatorType;
  value: string;
}

const EMPTY_INDICATOR: DraftIndicator = { type: "domain", value: "" };

export function ThreatReportForm() {
  const qc = useQueryClient();
  const [type, setType] = useState<ThreatType>("phishing");
  const [severity, setSeverity] = useState<Severity>("high");
  const [description, setDescription] = useState("");
  const [mitre, setMitre] = useState<string>("");
  const [indicators, setIndicators] = useState<DraftIndicator[]>([{ ...EMPTY_INDICATOR }]);

  const submit = useMutation({
    mutationFn: (req: ThreatReportRequest) => api.submitThreatReport(req),
    onSuccess: (res) => {
      toast.success(`Report submitted as Bank #${res.anonymousReporter}`, {
        description: `Sigma rule ${res.sigmaRuleId} deployed to network`,
      });
      qc.invalidateQueries({ queryKey: ["threats", "feed"] });
      setDescription("");
      setMitre("");
      setIndicators([{ ...EMPTY_INDICATOR }]);
    },
    onError: (err) => {
      toast.error("Submission failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  function updateIndicator(i: number, patch: Partial<DraftIndicator>) {
    setIndicators((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addIndicator() {
    setIndicators((prev) => [...prev, { ...EMPTY_INDICATOR }]);
  }

  function removeIndicator(i: number) {
    setIndicators((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned: Indicator[] = indicators
      .map((row) => ({ ...row, value: row.value.trim() }))
      .filter((row) => row.value.length > 0)
      .map((row) => ({ ...row, first_seen: new Date().toISOString() }));

    if (cleaned.length === 0) {
      toast.error("Add at least one indicator");
      return;
    }
    if (!description.trim()) {
      toast.error("Add a short description");
      return;
    }

    submit.mutate({
      type,
      severity,
      description: description.trim(),
      indicators: cleaned,
      ...(mitre ? { mitre_tactic: mitre } : {}),
    });
  }

  return (
    <Card title="Submit a threat report" subtitle="Auto-generates a Sigma rule for the network">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="type">Threat type</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as ThreatType)}>
              {THREAT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity</Label>
            <Select
              id="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label hint="domain · ipv4 · url · file_hash · ja4 · email_sender">Indicators</Label>
          <div className="space-y-2">
            {indicators.map((row, i) => (
              <div key={i} className="flex gap-2">
                <Select
                  value={row.type}
                  onChange={(e) =>
                    updateIndicator(i, { type: e.target.value as IndicatorType })
                  }
                  className="w-40"
                >
                  {INDICATOR_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
                <Input
                  value={row.value}
                  onChange={(e) => updateIndicator(i, { value: e.target.value })}
                  placeholder={placeholderFor(row.type)}
                />
                <button
                  type="button"
                  onClick={() => removeIndicator(i)}
                  disabled={indicators.length === 1}
                  className="rounded-lg px-2 text-slate-400 hover:bg-slate-800/60 hover:text-danger-400 disabled:opacity-40"
                  aria-label="Remove indicator"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" onClick={addIndicator} className="!px-2 !py-1">
            <Plus className="h-3.5 w-3.5" />
            Add indicator
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anonymized summary — e.g. spoofed eSewa login at /v2/login harvesting credentials and OTP."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mitre">MITRE ATT&CK tactic</Label>
          <Select id="mitre" value={mitre} onChange={(e) => setMitre(e.target.value)}>
            {MITRE_TACTICS.map(([id, name]) => (
              <option key={id || "none"} value={id}>
                {id ? `${id} · ${name}` : name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={submit.isPending}>
            <Send className="h-4 w-4" />
            {submit.isPending ? "Submitting…" : "Submit & deploy Sigma rule"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function placeholderFor(t: IndicatorType): string {
  switch (t) {
    case "domain":       return "esewa-verify.xyz";
    case "ipv4":         return "203.0.113.42";
    case "url":          return "https://esewa-verify.xyz/login";
    case "file_hash":    return "sha256:9f8e…";
    case "ja4":          return "t13d1516h2_8daaf6152771_b186095e22b6";
    case "email_sender": return "alerts@esewa-verify.xyz";
  }
}
