import type { Verdict, ThreatCategory, Severity } from "./types";
import {
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  ShieldX,
  Syringe,
  Bug,
  UserRoundX,
  MessageSquareWarning,
  ScrollText,
  Binary,
  FileWarning,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

interface VerdictMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text color token */
  color: string;
  /** background tint */
  bg: string;
  border: string;
  /** raw css var for charts / svg */
  hex: string;
  badge: "allow" | "sanitize" | "quarantine" | "block";
}

export const VERDICTS: Record<Verdict, VerdictMeta> = {
  ALLOW: {
    label: "Allow",
    description: "Traffic is clean and forwarded without modification.",
    icon: ShieldCheck,
    color: "text-allow",
    bg: "bg-allow/12",
    border: "border-allow/25",
    hex: "var(--allow)",
    badge: "allow",
  },
  SANITIZE: {
    label: "Sanitize",
    description: "Sensitive or unsafe fragments are stripped before delivery.",
    icon: Sparkles,
    color: "text-sanitize",
    bg: "bg-sanitize/12",
    border: "border-sanitize/25",
    hex: "var(--sanitize)",
    badge: "sanitize",
  },
  QUARANTINE: {
    label: "Quarantine",
    description: "Message is held for review; delivery is suspended.",
    icon: ShieldAlert,
    color: "text-quarantine",
    bg: "bg-quarantine/12",
    border: "border-quarantine/25",
    hex: "var(--quarantine)",
    badge: "quarantine",
  },
  BLOCK: {
    label: "Block",
    description: "Malicious payload is dropped and the actor is flagged.",
    icon: ShieldX,
    color: "text-block",
    bg: "bg-block/12",
    border: "border-block/30",
    hex: "var(--block)",
    badge: "block",
  },
};

interface CategoryMeta {
  label: string;
  short: string;
  icon: LucideIcon;
  description: string;
  hex: string;
}

export const CATEGORIES: Record<ThreatCategory, CategoryMeta> = {
  prompt_injection: {
    label: "Prompt Injection",
    short: "Injection",
    icon: Syringe,
    description:
      "Attempts to override system instructions or hijack the agent's intent.",
    hex: "var(--block)",
  },
  tool_poisoning: {
    label: "Tool Poisoning",
    short: "Poisoning",
    icon: Bug,
    description:
      "Malicious tool descriptions or responses engineered to manipulate the model.",
    hex: "var(--quarantine)",
  },
  pii_leakage: {
    label: "PII Leakage",
    short: "PII",
    icon: UserRoundX,
    description:
      "Emails, keys, tokens, or personal data leaving the trust boundary.",
    hex: "var(--accent-cyan)",
  },
  toxicity: {
    label: "Toxicity",
    short: "Toxicity",
    icon: MessageSquareWarning,
    description: "Harmful, abusive, or unsafe language in either direction.",
    hex: "var(--accent-violet)",
  },
  policy_violation: {
    label: "Policy Violation",
    short: "Policy",
    icon: ScrollText,
    description: "Content breaching organizational or compliance rules.",
    hex: "var(--sanitize)",
  },
  encoded_payload: {
    label: "Encoded Payload",
    short: "Encoded",
    icon: Binary,
    description:
      "Base64, hex, unicode, or homoglyph obfuscation hiding an attack.",
    hex: "var(--accent-indigo)",
  },
  schema_anomaly: {
    label: "Schema Anomaly",
    short: "Schema",
    icon: FileWarning,
    description: "Unexpected structure, extra fields, or drift from the contract.",
    hex: "var(--primary)",
  },
  benign: {
    label: "Benign",
    short: "Benign",
    icon: CircleCheck,
    description: "No threat detected - normal operational traffic.",
    hex: "var(--allow)",
  },
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; hex: string; rank: number }
> = {
  low: { label: "Low", color: "text-allow", hex: "var(--allow)", rank: 1 },
  medium: {
    label: "Medium",
    color: "text-sanitize",
    hex: "var(--sanitize)",
    rank: 2,
  },
  high: {
    label: "High",
    color: "text-quarantine",
    hex: "var(--quarantine)",
    rank: 3,
  },
  critical: {
    label: "Critical",
    color: "text-block",
    hex: "var(--block)",
    rank: 4,
  },
};

/** Map a 0–100 risk score to its verdict band (mirrors backend thresholds). */
export function verdictForScore(score: number): Verdict {
  if (score >= 75) return "BLOCK";
  if (score >= 50) return "QUARANTINE";
  if (score >= 25) return "SANITIZE";
  return "ALLOW";
}

export function severityForScore(score: number): Severity {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export const CHART_COLORS = {
  primary: "var(--primary)",
  cyan: "var(--accent-cyan)",
  violet: "var(--accent-violet)",
  indigo: "var(--accent-indigo)",
  allow: "var(--allow)",
  sanitize: "var(--sanitize)",
  quarantine: "var(--quarantine)",
  block: "var(--block)",
  muted: "var(--muted)",
};
