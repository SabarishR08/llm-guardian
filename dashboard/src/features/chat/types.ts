import type { ThreatCategory, Verdict, DetectionSignal, Severity } from "@/lib/types";

export type MessageRole = "user" | "assistant";

export interface Attachment {
  name: string;
  size: number;
  content?: string; // text content, only for small text-like files
}

export interface ThreatEvidence {
  indicator: string;
  line: number | null;
  confidence: "High" | "Medium" | "Low";
  category: ThreatCategory;
}

export interface GuardianVerdictPayload {
  riskScore: number;
  category: ThreatCategory;
  verdict: Verdict;
  severity: Severity;
  explanation: string;
  recommendedAction: string;
  signals: DetectionSignal[];
  latencyMs: number;
  evidence: ThreatEvidence[];
  sanitizedPreview: string | null;
}

export type ToolName = "read_document" | "list_documents" | "web_search" | "send_notification";

/** One step in the agent pipeline, rendered inline within an assistant turn. */
export type PipelineStep =
  | { kind: "inbound_scan"; status: "scanning" | "done"; result?: GuardianVerdictPayload }
  | { kind: "thinking" }
  | { kind: "tool_call"; tool: ToolName; args: Record<string, unknown>; status: "running" | "done" }
  | { kind: "tool_result"; tool: ToolName; content: string; isError: boolean; isLive: boolean }
  | { kind: "guardian_scan"; status: "scanning" | "done"; result?: GuardianVerdictPayload };

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  steps?: PipelineStep[];
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
