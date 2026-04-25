import type {
  GnnClusterRequest,
  GnnClusterResponse,
  SigmaRulesResponse,
  ThreatFeedResponse,
  ThreatReportRequest,
  ThreatReportResponse,
  ZKVerifyRequest,
  ZKVerifyResponse,
} from "@/types/contracts";
import * as mocks from "@/mocks/data";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") === "true";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${text || path}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API surface — falls back to mocks when VITE_USE_MOCKS=true. Each method
// matches the OpenAPI spec at contracts/openapi.yaml.
// ---------------------------------------------------------------------------

export const api = {
  zkVerify(body: ZKVerifyRequest): Promise<ZKVerifyResponse> {
    if (USE_MOCKS) return mocks.mockZkVerify(body);
    return request("/auth/zk-verify", { method: "POST", body: JSON.stringify(body) });
  },

  submitThreatReport(body: ThreatReportRequest): Promise<ThreatReportResponse> {
    if (USE_MOCKS) return mocks.mockSubmitThreatReport(body);
    return request("/threats/report", { method: "POST", body: JSON.stringify(body) });
  },

  threatFeed(since?: string): Promise<ThreatFeedResponse> {
    if (USE_MOCKS) return mocks.mockThreatFeed(since);
    const q = since ? `?since=${encodeURIComponent(since)}` : "";
    return request(`/threats/feed${q}`);
  },

  sigmaRules(since?: string): Promise<SigmaRulesResponse> {
    if (USE_MOCKS) return mocks.mockSigmaRules();
    const q = since ? `?since=${encodeURIComponent(since)}` : "";
    return request(`/sigma/rules${q}`);
  },

  gnnCluster(body: GnnClusterRequest): Promise<GnnClusterResponse> {
    if (USE_MOCKS) return mocks.mockGnnCluster(body);
    return request("/gnn/cluster", { method: "POST", body: JSON.stringify(body) });
  },
};

export const config = { BASE, USE_MOCKS };
