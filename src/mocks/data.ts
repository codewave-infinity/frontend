import type {
  ClusterMember,
  GnnClusterRequest,
  GnnClusterResponse,
  Indicator,
  IndicatorType,
  Severity,
  SigmaRule,
  SigmaRulesResponse,
  ThreatFeedResponse,
  ThreatReport,
  ThreatReportRequest,
  ThreatReportResponse,
  ThreatType,
  ZKVerifyRequest,
  ZKVerifyResponse,
} from "@/types/contracts";
import type { FeedEvent, FeedSubscription } from "@/lib/ws";

// ---------------------------------------------------------------------------
// In-memory mock state. Lives in the browser tab — refresh resets it.
// ---------------------------------------------------------------------------

const NEPAL_BRAND_TARGETS = ["esewa", "khalti", "nabil", "nibl", "nic", "daraz"];
const SUFFIXES = [".xyz", ".click", ".live", ".support", ".online", ".top"];
const PHISHY_VERBS = ["verify", "secure", "update", "login", "otp", "kyc"];

const _bankCreds: Record<string, number> = {
  A7F3: 0.84,
  B2C9: 0.71,
  C13E: 0.62,
  D5A1: 0.55,
  E8B0: 0.42,
  F0DD: 0.31,
};
let _reports: ThreatReport[] = seedReports(8);
let _listeners: Array<(e: FeedEvent) => void> = [];

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

export async function mockZkVerify(_body: ZKVerifyRequest): Promise<ZKVerifyResponse> {
  await delay(180);
  const anonymousId = randomBankId();
  return {
    sessionToken: "mock." + anonymousId + "." + Date.now(),
    anonymousId,
    credibilityScore: _bankCreds[anonymousId] ?? 0.5,
  };
}

export async function mockSubmitThreatReport(
  body: ThreatReportRequest,
): Promise<ThreatReportResponse> {
  await delay(220);
  const reportId = "rpt_" + Math.random().toString(36).slice(2, 10);
  const sigmaRuleId = "sig_" + Math.random().toString(36).slice(2, 10);
  const reporter = randomBankId();

  const report: ThreatReport = {
    ...body,
    reportId,
    anonymousReporter: reporter,
    credibility: _bankCreds[reporter] ?? 0.5,
    createdAt: new Date().toISOString(),
  };
  _reports = [report, ..._reports].slice(0, 200);
  emit({ kind: "report", report });

  // Simulate the GNN cluster expansion that the backend would trigger.
  setTimeout(() => {
    const seed = body.indicators[0];
    const cluster = fakeClusterFor(seed);
    emit({ kind: "cluster", seedId: reportId, members: cluster });
  }, 900);

  return { reportId, sigmaRuleId, anonymousReporter: reporter };
}

export async function mockThreatFeed(_since?: string): Promise<ThreatFeedResponse> {
  await delay(120);
  return { reports: _reports.slice(0, 50), pagination: { cursor: null, hasMore: false } };
}

export async function mockSigmaRules(): Promise<SigmaRulesResponse> {
  await delay(120);
  const rules: SigmaRule[] = _reports.slice(0, 5).map((r, i) => ({
    id: "sig_" + r.reportId,
    yaml: sigmaYamlFor(r, i),
    sourceCredibility: r.credibility,
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
  }));
  return { rules };
}

export async function mockGnnCluster(body: GnnClusterRequest): Promise<GnnClusterResponse> {
  await delay(160);
  return { cluster: fakeClusterFor(body.seedIndicator) };
}

// ---------------------------------------------------------------------------
// Live stream — drops a synthetic report every 8–14 seconds so the dashboard
// has something to render in dev with no backend.
// ---------------------------------------------------------------------------

export function mockLiveStream(onEvent: (e: FeedEvent) => void): FeedSubscription {
  _listeners.push(onEvent);

  const tick = () => {
    const indicator = randomIndicator();
    const reporter = randomBankId();
    const report: ThreatReport = {
      reportId: "rpt_" + Math.random().toString(36).slice(2, 10),
      type: pick<ThreatType>(["phishing", "phishing", "phishing", "malware", "c2"]),
      indicators: [indicator],
      severity: pick<Severity>(["low", "medium", "high", "high", "critical"]),
      description: `Auto-detected: ${indicator.value}`,
      anonymousReporter: reporter,
      credibility: _bankCreds[reporter] ?? 0.5,
      createdAt: new Date().toISOString(),
    };
    _reports = [report, ..._reports].slice(0, 200);
    emit({ kind: "report", report });

    // 35% chance of a follow-on cluster ripple.
    if (Math.random() < 0.35) {
      setTimeout(() => emit({ kind: "cluster", seedId: report.reportId, members: fakeClusterFor(indicator) }), 700);
    }
  };

  const interval = window.setInterval(tick, 8000 + Math.random() * 6000);
  return {
    close: () => {
      window.clearInterval(interval);
      _listeners = _listeners.filter((l) => l !== onEvent);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emit(e: FeedEvent) {
  for (const l of _listeners) l(e);
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

function randomBankId(): string {
  return pick(["A7F3", "B2C9", "C13E", "D5A1", "E8B0", "F0DD"]);
}

function fakePhishingDomain(): string {
  const brand = pick(NEPAL_BRAND_TARGETS);
  const verb = pick(PHISHY_VERBS);
  const sep = pick(["-", "."]);
  return `${brand}${sep}${verb}${pick(SUFFIXES)}`;
}

function randomIp(): string {
  const o = () => Math.floor(1 + Math.random() * 254);
  return `${o()}.${o()}.${o()}.${o()}`;
}

function randomIndicator(): Indicator {
  const type: IndicatorType = pick(["domain", "domain", "domain", "ipv4", "url"]);
  const value =
    type === "domain" ? fakePhishingDomain()
    : type === "ipv4"   ? randomIp()
    :                     `https://${fakePhishingDomain()}/login`;
  return { type, value, first_seen: new Date().toISOString() };
}

function fakeClusterFor(seed: Indicator): ClusterMember[] {
  const n = 4 + Math.floor(Math.random() * 6);
  const out: ClusterMember[] = [];
  for (let i = 0; i < n; i++) {
    const ind = randomIndicator();
    if (ind.value === seed.value) continue;
    out.push({
      indicator: ind,
      score: 0.6 + Math.random() * 0.39,
      relationship: pick([
        "resolves_to",
        "shares_cert_with",
        "registered_via",
        "same_asn",
        "embedding_neighbor",
      ]),
    });
  }
  return out;
}

function seedReports(n: number): ThreatReport[] {
  const out: ThreatReport[] = [];
  for (let i = 0; i < n; i++) {
    const reporter = randomBankId();
    out.push({
      reportId: "rpt_seed_" + i,
      type: pick<ThreatType>(["phishing", "phishing", "malware", "c2"]),
      indicators: [randomIndicator()],
      severity: pick<Severity>(["low", "medium", "high", "high", "critical"]),
      description: "Seeded sample report — replace once backend is wired.",
      anonymousReporter: reporter,
      credibility: _bankCreds[reporter] ?? 0.5,
      createdAt: new Date(Date.now() - i * 47_000).toISOString(),
    });
  }
  return out;
}

function sigmaYamlFor(r: ThreatReport, idx: number): string {
  const ind = r.indicators[0];
  return `title: SecureShare DNS Block — ${ind?.value ?? "unknown"}
id: ${r.reportId}
status: experimental
description: Auto-generated rule from threat report ${r.reportId}.
references:
  - secureshare://reports/${r.reportId}
date: ${new Date().toISOString().slice(0, 10)}
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
  - secureshare.credibility.${r.credibility >= 0.7 ? "high" : r.credibility >= 0.4 ? "medium" : "low"}
${idx === 0 ? "" : ""}`;
}

// Top contributors list used by the credibility widget.
export function mockTopContributors() {
  return Object.entries(_bankCreds)
    .sort((a, b) => b[1] - a[1])
    .map(([id, score], i) => ({
      anonymousId: id,
      score,
      rank: i + 1,
      reportsThisWeek: 12 - i * 2 + Math.floor(Math.random() * 3),
    }));
}

export function mockNetworkStats() {
  return {
    totalReports: _reports.length + 142,
    blocksAcrossNetwork: 18_392,
    activeGateways: 14,
    flAccuracyHistory: Array.from({ length: 12 }, (_, i) => ({
      round: i + 1,
      accuracy: 0.72 + i * 0.018 + Math.random() * 0.01,
    })),
  };
}

export function mockProblemFeed() {
  return [
    {
      id: "pr_001",
      mitre_tactic: "TA0001",
      title: "Spear-phishing wave targeting CFO mailboxes",
      description:
        "Highly tailored Nepali-language emails impersonating an audit firm. PDF attachments deliver Cobalt Strike beacon over DoH.",
      anonymousReporter: "C13E",
      createdAt: new Date(Date.now() - 1_200_000).toISOString(),
    },
    {
      id: "pr_002",
      mitre_tactic: "TA0040",
      title: "Ransomware preparing for weekend execution",
      description:
        "Detected exfil of finance share to MEGA over the weekend. Blocked at gateway. Sharing TTPs in case other orgs see the same staging behaviour.",
      anonymousReporter: "B2C9",
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: "pr_003",
      mitre_tactic: "TA0008",
      title: "Lateral movement via misconfigured SMB share",
      description:
        "Weak service account credentials reused across 3 domain-joined hosts. Recommend immediate audit of svc_* accounts.",
      anonymousReporter: "A7F3",
      createdAt: new Date(Date.now() - 9_300_000).toISOString(),
    },
  ];
}
