// SecureShare shared types — mirror of contracts/openapi.yaml.
// Drop this file into the React dashboard. If the OpenAPI spec changes,
// update this file in the same PR.

export type ISODateTime = string;

// ---------------------------------------------------------------------------
// Enums (string unions — keep them in sync with the Pydantic enums)
// ---------------------------------------------------------------------------

export type IndicatorType =
  | "domain"
  | "ipv4"
  | "url"
  | "file_hash"
  | "ja4"
  | "email_sender";

export type ThreatType = "phishing" | "malware" | "ddos" | "c2";

export type Severity = "low" | "medium" | "high" | "critical";

export type ClusterRelationship =
  | "resolves_to"
  | "issued_by"
  | "shares_cert_with"
  | "registered_via"
  | "same_asn"
  | "embedding_neighbor";

// ---------------------------------------------------------------------------
// Core data shapes
// ---------------------------------------------------------------------------

export interface Indicator {
  type: IndicatorType;
  value: string;
  first_seen: ISODateTime;
}

// ---------------------------------------------------------------------------
// /auth/zk-verify
// ---------------------------------------------------------------------------

export interface ZKVerifyRequest {
  proof: string | Record<string, unknown>;
  publicSignals: string[];
  nullifierHash: string;
}

export interface ZKVerifyResponse {
  sessionToken: string;
  anonymousId: string;
  credibilityScore: number; // [0, 1]
}

// ---------------------------------------------------------------------------
// /threats/*
// ---------------------------------------------------------------------------

export interface ThreatReportRequest {
  type: ThreatType;
  indicators: Indicator[];
  severity: Severity;
  description: string;
  mitre_tactic?: string | null;
}

export interface ThreatReportResponse {
  reportId: string;
  sigmaRuleId: string;
  anonymousReporter: string;
}

export interface ThreatReport extends ThreatReportRequest {
  reportId: string;
  anonymousReporter: string;
  credibility: number; // [0, 1]
  createdAt: ISODateTime;
}

export interface Pagination {
  cursor: string | null;
  hasMore: boolean;
}

export interface ThreatFeedResponse {
  reports: ThreatReport[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// /sigma/rules
// ---------------------------------------------------------------------------

export interface SigmaRule {
  id: string;
  yaml: string;
  sourceCredibility: number; // [0, 1]
  expiresAt: ISODateTime;
}

export interface SigmaRulesResponse {
  rules: SigmaRule[];
}

// ---------------------------------------------------------------------------
// /telemetry/confirm
// ---------------------------------------------------------------------------

export interface TelemetryConfirmRequest {
  ruleIds: string[];
  hitCounts: number[];
  aggregatedAt: ISODateTime;
}

export interface TelemetryConfirmResponse {
  accepted: number;
  credibilityDelta: number;
}

// ---------------------------------------------------------------------------
// /gnn/cluster
// ---------------------------------------------------------------------------

export interface GnnClusterRequest {
  seedIndicator: Indicator;
}

export interface ClusterMember {
  indicator: Indicator;
  score: number; // [0, 1]
  relationship: ClusterRelationship;
}

export interface GnnClusterResponse {
  cluster: ClusterMember[];
}

// ---------------------------------------------------------------------------
// /fl/*
// ---------------------------------------------------------------------------

export interface FlRegisterRequest {
  gatewayPublicKey: string;
  capabilities: string[];
}

export interface FlRegisterResponse {
  clientId: string;
  aggregatorEndpoint: string;
  currentRound: number;
}

export interface FlSubmitUpdateResponse {
  accepted: boolean;
  nextRoundAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Gateway internal API
// ---------------------------------------------------------------------------

export interface GatewayStatus {
  layersActive: number[];
  ruleCount: number;
  modelVersion: string;
  blocksToday: number;
}

export interface BlockEvent {
  timestamp: ISODateTime;
  layer: number;
  indicator: string;
  reason: string;
}

export interface BlocksRecentResponse {
  events: BlockEvent[];
}

export interface WhitelistRequest {
  domain: string;
  reason: string;
}
