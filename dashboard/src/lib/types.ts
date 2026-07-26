/**
 * Shared domain contract - mirrors the FastAPI backend schemas.
 * Keep in sync with `backend/app/schemas`.
 */

export type Verdict = "ALLOW" | "SANITIZE" | "QUARANTINE" | "BLOCK";

export type ThreatCategory =
  | "prompt_injection"
  | "tool_poisoning"
  | "pii_leakage"
  | "toxicity"
  | "policy_violation"
  | "encoded_payload"
  | "schema_anomaly"
  | "benign";

export type Direction = "inbound" | "outbound";

export type Severity = "low" | "medium" | "high" | "critical";

/** A single detector's contribution to the overall assessment. */
export interface DetectionSignal {
  detector: string;
  category: ThreatCategory;
  score: number; // 0–100 contribution
  confidence: number; // 0–1
  matched: string[]; // evidence snippets
  message: string;
}

/** A fully assessed message that passed through Guardian. */
export interface GuardianEvent {
  id: string;
  timestamp: string; // ISO
  direction: Direction;
  source: string; // agent / user / tool identity
  target: string;
  tool?: string;
  riskScore: number; // 0–100
  category: ThreatCategory;
  verdict: Verdict;
  severity: Severity;
  explanation: string;
  recommendedAction: string;
  signals: DetectionSignal[];
  latencyMs: number;
  preview: string; // redacted content preview
  llmReasoned: boolean;
}

export interface MetricPoint {
  t: string; // ISO or label
  inspected: number;
  blocked: number;
  quarantined: number;
  sanitized: number;
  allowed: number;
}

export interface SystemHealthComponent {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  detail: string;
}

export interface McpServer {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  status: "connected" | "connecting" | "error";
  tools: number;
  riskLevel: Severity;
  lastSeen: string;
}

export interface ConnectedAgent {
  id: string;
  name: string;
  model: string;
  status: "active" | "idle" | "quarantined";
  requests: number;
  blocked: number;
  trustScore: number; // 0–100
}

export interface Incident {
  id: string;
  title: string;
  category: ThreatCategory;
  severity: Severity;
  verdict: Verdict;
  status: "open" | "investigating" | "mitigated" | "resolved";
  timestamp: string;
  source: string;
  affected: string[];
  riskScore: number;
}

export interface DashboardStats {
  inspected: number;
  blocked: number;
  quarantined: number;
  sanitized: number;
  threatsToday: number;
  avgRiskScore: number;
  avgLatencyMs: number;
  activeAgents: number;
  connectedServers: number;
  blockRate: number; // percentage
}
