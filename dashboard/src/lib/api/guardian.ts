/**
 * Typed API helpers for the Guardian backend.
 *
 * Every function returns real data from the FastAPI service.
 * Callers should catch ApiError and fall back to demo data when the backend
 * is unreachable (status === 0) — the telemetry store does this automatically.
 */

import { apiRequest } from "./client";
import type { GuardianEvent, DashboardStats } from "@/lib/types";

// ── Stats ──────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>("/api/stats");
}

// ── Events ─────────────────────────────────────────────────────────────────

export async function fetchEvents(limit = 250): Promise<GuardianEvent[]> {
  return apiRequest<GuardianEvent[]>(`/api/events?limit=${limit}`);
}

// ── System health ──────────────────────────────────────────────────────────

export interface DetectorInfo {
  name: string;
  upgraded: boolean;
}

export interface SystemHealthResponse {
  status: string;
  version: string;
  environment: string;
  detectors: {
    total: number;
    upgraded: number;
    list: DetectorInfo[];
  };
  llm_provider: string;
  event_store: string;   // "redis" | "memory"
  ws_clients: number;
  thresholds: {
    sanitize: number;
    quarantine: number;
    block: number;
  };
  // Structured panel data returned directly by the enriched /api/health.
  system_components?: SystemHealthComponent[];
}

export async function fetchHealth(): Promise<SystemHealthResponse> {
  return apiRequest<SystemHealthResponse>("/api/health");
}

// ── Reports ────────────────────────────────────────────────────────────────

export interface ReportSummary {
  generatedAt: string;
  window: string;
  stats: DashboardStats;
  topCategories: { category: string; count: number }[];
}

export async function fetchReportSummary(): Promise<ReportSummary> {
  return apiRequest<ReportSummary>("/api/reports/summary");
}

// ── Traffic time-series ────────────────────────────────────────────────────
// Derives a 30-point time-series from the raw event list.
//
// Bucket width is adaptive:
//   • Session < 30 min  → 1-minute buckets  (30 pts covering last 30 min)
//   • Session < 6 h     → 15-minute buckets (30 pts covering last 7.5 h)
//   • Session < 24 h    → 1-hour buckets    (24 pts covering last 24 h)
//   • Session ≥ 24 h    → 2-hour buckets    (24 pts covering last 48 h)
//
// This way, a fresh session (all events in the last few minutes) shows a
// meaningful minute-resolution chart instead of 29 empty hourly bars.

import type { MetricPoint } from "@/lib/types";

const NUM_BUCKETS = 30;

function bucketWidthMs(events: GuardianEvent[]): number {
  if (events.length === 0) return 60 * 60 * 1000; // default: 1 h

  const now = Date.now();
  const oldest = events.reduce(
    (min, e) => Math.min(min, new Date(e.timestamp).getTime()),
    now,
  );
  const spanMs = now - oldest;

  if (spanMs <= 30 * 60 * 1000)        return      60 * 1000; // 1 min
  if (spanMs <= 6  * 60 * 60 * 1000)   return  15 * 60 * 1000; // 15 min
  if (spanMs <= 24 * 60 * 60 * 1000)   return  60 * 60 * 1000; // 1 h
  return                                     2 * 60 * 60 * 1000; // 2 h
}

export function buildTrafficSeries(events: GuardianEvent[]): MetricPoint[] {
  const now = Date.now();
  const width = bucketWidthMs(events);

  // Build NUM_BUCKETS slots, oldest first.
  const buckets: MetricPoint[] = Array.from({ length: NUM_BUCKETS }, (_, i) => ({
    t: new Date(now - (NUM_BUCKETS - 1 - i) * width).toISOString(),
    inspected: 0,
    blocked: 0,
    quarantined: 0,
    sanitized: 0,
    allowed: 0,
  }));

  for (const e of events) {
    const age = now - new Date(e.timestamp).getTime();
    const idx = NUM_BUCKETS - 1 - Math.floor(age / width);
    if (idx < 0 || idx >= NUM_BUCKETS) continue;
    const b = buckets[idx];
    b.inspected += 1;
    if (e.verdict === "BLOCK")          b.blocked += 1;
    else if (e.verdict === "QUARANTINE") b.quarantined += 1;
    else if (e.verdict === "SANITIZE")   b.sanitized += 1;
    else                                 b.allowed += 1;
  }

  return buckets;
}

// ── Health → SystemHealthComponent mapping ─────────────────────────────────
// Convert the raw /api/health response into the SystemHealthComponent[] shape
// the dashboard store and overview page consume.

import type { SystemHealthComponent } from "@/lib/types";

export function healthToComponents(h: SystemHealthResponse): SystemHealthComponent[] {
  // When the backend returns the pre-built system_components list (new enriched
  // health endpoint), use it directly — it already has real per-detector latencies.
  if (h.system_components && h.system_components.length > 0) {
    return h.system_components;
  }

  // Fallback for older backend versions that don't include system_components.
  const components: SystemHealthComponent[] = [];

  components.push({
    name: "Detection Engine",
    status: "operational",
    latencyMs: 0,
    detail: `${h.detectors.total} detectors · ${h.detectors.upgraded} LLM-upgraded`,
  });

  components.push({
    name: "WebSocket Gateway",
    status: "operational",
    latencyMs: 0,
    detail: `${h.ws_clients} client${h.ws_clients !== 1 ? "s" : ""} connected`,
  });

  components.push({
    name: `LLM Explainer (${h.llm_provider})`,
    status: "operational",
    latencyMs: 0,
    detail: h.llm_provider ? "primary" : "disabled",
  });

  const storeOk = h.event_store === "redis";
  components.push({
    name: "Event Store",
    status: storeOk ? "operational" : "degraded",
    latencyMs: 0,
    detail: storeOk ? "Redis connected" : "in-memory fallback",
  });

  return components;
}

// ── Attack Chains (RH-0045 Challenge Feature) ─────────────────────────────

export interface AttackChainHop {
  step: number;
  timestamp: string;
  tool: string;
  source: string;
  target: string;
  category: string;
  verdict: string;
  riskScore: number;
  summary: string;
}

export interface AttackChainNode {
  id: string;
  label: string;
  sub: string;
  kind: "user" | "agent" | "guardian" | "tool";
  risk: "clean" | "warning" | "danger";
  x?: number;
  y?: number;
}

export interface AttackChainEdge {
  from: string;
  to: string;
  threat?: boolean;
  label?: string;
}

export interface AttackChainData {
  id: string;
  title: string;
  sessionId: string;
  patternType: string;
  riskScore: number;
  confidence: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  hops: AttackChainHop[];
  nodes: AttackChainNode[];
  edges: AttackChainEdge[];
}

export interface AttackChainsResponse {
  challenge: {
    teamName: string;
    teamId: string;
    feature: string;
    status: string;
  };
  totalChains: number;
  chains: AttackChainData[];
}

export async function fetchAttackChains(): Promise<AttackChainsResponse> {
  return apiRequest<AttackChainsResponse>("/api/attack-chains");
}

export async function simulateAttackChain(): Promise<{ status: string; message: string; chain: AttackChainData }> {
  return apiRequest<{ status: string; message: string; chain: AttackChainData }>("/api/attack-chains/simulate", {
    method: "POST",
  });
}

