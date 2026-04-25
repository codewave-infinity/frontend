import type { ThreatReport, ClusterMember } from "@/types/contracts";
import { mockLiveStream } from "@/mocks/data";

const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") === "true";
const WS_URL = import.meta.env.VITE_WS_URL ?? "/ws/feed";

export type FeedEvent =
  | { kind: "report"; report: ThreatReport }
  | { kind: "cluster"; seedId: string; members: ClusterMember[] };

export interface FeedSubscription {
  close(): void;
}

export function subscribeFeed(onEvent: (e: FeedEvent) => void): FeedSubscription {
  if (USE_MOCKS) return mockLiveStream(onEvent);

  const url = WS_URL.startsWith("ws")
    ? WS_URL
    : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${WS_URL}`;
  const ws = new WebSocket(url);
  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as FeedEvent);
    } catch {
      // ignore malformed frames in v1
    }
  };
  return { close: () => ws.close() };
}
