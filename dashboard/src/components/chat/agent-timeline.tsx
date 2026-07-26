"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Wrench,
  Zap,
  Shield,
  ScanSearch,
  Gauge,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  Wifi,
  FlaskConical,
  ChevronDown,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { ChatMessage, PipelineStep, GuardianVerdictPayload, ToolName } from "@/features/chat/types";
import { CATEGORIES, VERDICTS } from "@/lib/constants";
import { RiskMeter, VerdictBadge } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Node model - derived from the real SSE-driven pipeline steps        */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "primary" | "allow" | "block" | "warn";
type NodeStatus = "active" | "done";

interface TimelineNode {
  id: string;
  emoji: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  status: NodeStatus;
  tone: Tone;
  detail?: React.ReactNode;
  hero?: boolean;
}

const TOOL_LABEL: Record<ToolName, string> = {
  read_document: "read_document",
  list_documents: "list_documents",
  web_search: "web_search",
  send_notification: "send_notification",
};

function argString(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : JSON.stringify(v)}`)
    .join(", ");
}

const DETECTORS = [
  "Prompt Injection",
  "Tool Poisoning",
  "PII Leakage",
  "Toxicity",
  "Encoded Payload",
  "Schema Anomaly",
  "Policy Violation",
];

function verdictTone(v: GuardianVerdictPayload["verdict"]): Tone {
  if (v === "ALLOW") return "allow";
  if (v === "BLOCK") return "block";
  return "warn";
}

function verdictIcon(v: GuardianVerdictPayload["verdict"]): LucideIcon {
  if (v === "ALLOW") return ShieldCheck;
  if (v === "BLOCK") return ShieldX;
  if (v === "SANITIZE") return Sparkles;
  return ShieldAlert;
}

function verdictEmoji(v: GuardianVerdictPayload["verdict"]): string {
  if (v === "ALLOW") return "✅";
  if (v === "BLOCK") return "🚨";
  return "⚠️";
}

/** Build the ordered story nodes from a streaming assistant message. */
function buildTimeline(message: ChatMessage): TimelineNode[] {
  const steps = message.steps ?? [];
  const nodes: TimelineNode[] = [];
  const streaming = !!message.streaming;
  const hasContent = message.content.trim().length > 0;

  const get = <K extends PipelineStep["kind"]>(kind: K) =>
    steps.find((s) => s.kind === kind) as Extract<PipelineStep, { kind: K }> | undefined;

  const inbound = get("inbound_scan");
  const inboundBlocked =
    inbound?.result && (inbound.result.verdict === "BLOCK" || inbound.result.verdict === "QUARANTINE");

  /* ---- Inbound-threat path: the user's own prompt is the attack ---- */
  if (inboundBlocked && inbound?.result) {
    const r = inbound.result;
    nodes.push({
      id: "intercept-in",
      emoji: "🛡",
      icon: Shield,
      title: "Guardian intercepts your prompt",
      subtitle: "Inbound message inspected before it reaches the model",
      status: "done",
      tone: "primary",
    });
    nodes.push(analysisNode(r, "in"));
    nodes.push(riskNode(r));
    nodes.push(decisionNode(r));
    nodes.push(finalResponseNode(message, streaming, hasContent, true));
    return nodes;
  }

  /* ---- Normal path ---- */
  const thinking = get("thinking");
  const toolCall = get("tool_call");
  const toolResult = get("tool_result");
  const guardScan = get("guardian_scan");

  if (thinking || toolCall || hasContent) {
    nodes.push({
      id: "think",
      emoji: "🤖",
      icon: Brain,
      title: "AI is thinking",
      subtitle: toolCall ? "Deciding which tool can answer this" : "Composing a response",
      status: toolCall || hasContent || !streaming ? "done" : "active",
      tone: "neutral",
    });
  }

  if (toolCall) {
    nodes.push({
      id: "tool-sel",
      emoji: "🔧",
      icon: Wrench,
      title: "Tool selected",
      subtitle: `${TOOL_LABEL[toolCall.tool]}(${argString(toolCall.args)})`,
      status: "done",
      tone: "primary",
    });

    const executed = !!toolResult;
    const errored = toolResult?.isError ?? false;
    nodes.push({
      id: "tool-exec",
      emoji: errored ? "⚠️" : "⚡",
      icon: errored ? AlertTriangle : Zap,
      title: !executed ? "Tool executing" : errored ? "Tool call failed" : "Tool executed successfully",
      subtitle: !executed ? "Running…" : errored ? "The tool could not complete - nothing was returned" : undefined,
      status: executed ? "done" : "active",
      tone: errored ? "warn" : "primary",
      detail: toolResult ? <ToolResultCard step={toolResult} /> : undefined,
    });
  }

  if (guardScan) {
    const scanning = guardScan.status === "scanning";
    nodes.push({
      id: "intercept",
      emoji: "🛡",
      icon: Shield,
      title: scanning ? "Guardian intercepting tool response" : "Guardian intercepted the response",
      subtitle: "Nothing reaches the AI until it clears inspection",
      status: scanning ? "active" : "done",
      tone: "primary",
    });
    nodes.push(analysisNode(guardScan.result, "out", scanning));

    if (guardScan.result) {
      nodes.push(riskNode(guardScan.result));
      nodes.push(decisionNode(guardScan.result));
    }
  }

  nodes.push(finalResponseNode(message, streaming, hasContent, false));
  return nodes;
}

function analysisNode(
  result: GuardianVerdictPayload | undefined,
  dir: "in" | "out",
  scanning = false,
): TimelineNode {
  const done = !!result && !scanning;
  const threat = result && result.category !== "benign";
  return {
    id: `analysis-${dir}`,
    emoji: "🔍",
    icon: ScanSearch,
    title: done ? "Security analysis complete" : "Running security analysis",
    subtitle: done
      ? threat
        ? `Threat found - ${CATEGORIES[result!.category].label}`
        : "All seven detectors cleared"
      : "Seven detectors scanning in parallel",
    status: done ? "done" : "active",
    tone: threat ? "warn" : "primary",
    detail: !done ? <DetectorSweep /> : undefined,
  };
}

function riskNode(result: GuardianVerdictPayload): TimelineNode {
  return {
    id: "risk",
    emoji: "📊",
    icon: Gauge,
    title: "Risk score generated",
    subtitle: `${result.riskScore.toFixed(0)} / 100 · ${result.signals.length} signal${result.signals.length === 1 ? "" : "s"}`,
    status: "done",
    tone: result.riskScore >= 75 ? "block" : result.riskScore >= 50 ? "warn" : "allow",
    detail: <RiskDetail result={result} />,
  };
}

function decisionNode(result: GuardianVerdictPayload): TimelineNode {
  return {
    id: "decision",
    emoji: verdictEmoji(result.verdict),
    icon: verdictIcon(result.verdict),
    title: `Verdict: ${VERDICTS[result.verdict].label.toUpperCase()}`,
    subtitle: result.explanation,
    status: "done",
    tone: verdictTone(result.verdict),
    hero: true,
    detail: <VerdictDetail result={result} />,
  };
}

function finalResponseNode(
  message: ChatMessage,
  streaming: boolean,
  hasContent: boolean,
  fromBlock: boolean,
): TimelineNode {
  const active = streaming && !hasContent;
  return {
    id: "final",
    emoji: "🤖",
    icon: MessageSquare,
    title: active ? "AI composing final response" : "AI final response",
    subtitle: fromBlock
      ? "Explaining what Guardian blocked - no unsafe data passed through"
      : "Shown below",
    status: active ? "active" : "done",
    tone: "neutral",
  };
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

const TONE_STYLES: Record<Tone, { dot: string; ring: string; text: string }> = {
  neutral: { dot: "bg-surface text-muted", ring: "border-border", text: "text-foreground" },
  primary: { dot: "bg-primary/12 text-primary-bright", ring: "border-primary/40", text: "text-foreground" },
  allow: { dot: "bg-allow/12 text-allow", ring: "border-allow/40", text: "text-foreground" },
  block: { dot: "bg-block/12 text-block", ring: "border-block/40", text: "text-foreground" },
  warn: { dot: "bg-quarantine/12 text-quarantine", ring: "border-quarantine/40", text: "text-foreground" },
};

export function AgentTimeline({ message }: { message: ChatMessage }) {
  const nodes = React.useMemo(() => buildTimeline(message), [message]);
  if (nodes.length === 0) return null;

  const live = !!message.streaming;

  return (
    <div className="my-1 overflow-hidden rounded-2xl border border-border/70 bg-card/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="relative flex size-2">
          {live && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-bright opacity-60" />
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-primary-bright" : "bg-allow")} />
        </span>
        <span className="text-xs font-medium tracking-wide text-muted">
          {live ? "Guardian pipeline · live" : "Guardian pipeline · trace"}
        </span>
        <span className="ml-auto font-mono text-[0.65rem] uppercase tracking-wider text-subtle">
          {nodes.length} stages
        </span>
      </div>

      <div className="relative py-2">
        <AnimatePresence initial={false}>
          {nodes.map((node, i) => (
            <TimelineRow key={node.id} node={node} isLast={i === nodes.length - 1} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TimelineRow({ node, isLast }: { node: TimelineNode; isLast: boolean }) {
  const tone = TONE_STYLES[node.tone];
  const [open, setOpen] = React.useState(node.hero);
  const active = node.status === "active";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex gap-3 px-4"
    >
      {/* rail */}
      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
            tone.dot,
            tone.ring,
            node.hero && "size-9 glow-primary",
          )}
        >
          {active && (
            <motion.span
              className={cn("absolute inset-0 rounded-full border-2", tone.ring)}
              animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <node.icon className={cn(node.hero ? "size-[18px]" : "size-4")} />
        </span>
        {!isLast && (
          <span
            className={cn(
              "w-px flex-1 bg-gradient-to-b from-border to-border/30",
              active && "from-primary-bright/50",
            )}
            style={{ minHeight: node.detail && open ? 8 : 14 }}
          />
        )}
      </div>

      {/* content */}
      <div className={cn("min-w-0 flex-1", isLast ? "pb-2" : "pb-3")}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-none">{node.emoji}</span>
              <span className={cn("text-sm font-medium", tone.text)}>{node.title}</span>
              {active && <ActiveDots />}
            </div>
            {node.subtitle && (
              <p
                className={cn(
                  "mt-0.5 truncate text-xs text-subtle",
                  node.id === "tool-sel" && "font-mono text-primary-bright/90",
                  node.hero && "whitespace-normal text-muted-foreground",
                )}
              >
                {node.subtitle}
              </p>
            )}
          </div>
          {node.detail && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-[0.7rem] text-subtle transition-colors hover:bg-surface hover:text-foreground"
            >
              {open ? "Hide" : "Details"}
              <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {node.detail && open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="pt-2">{node.detail}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ActiveDots() {
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1 rounded-full bg-primary-bright"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/* ------------------------------- detail cards ------------------------------ */

function DetectorSweep() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-primary/15 bg-primary/[0.03] p-2.5 sm:grid-cols-3">
      {DETECTORS.map((d, i) => (
        <motion.div
          key={d}
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.25, 1, 0.5] }}
          transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
          className="flex items-center gap-1.5 text-[0.7rem] text-muted"
        >
          <span className="size-1.5 rounded-full bg-primary-bright" />
          {d}
        </motion.div>
      ))}
    </div>
  );
}

function ToolResultCard({ step }: { step: Extract<PipelineStep, { kind: "tool_result" }> }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-subtle">
        {step.isError ? (
          <>
            <XCircle className="size-3 text-quarantine" /> Tool error - no content returned
          </>
        ) : step.isLive ? (
          <>
            <Wifi className="size-3 text-allow" /> Live tool response
          </>
        ) : (
          <>
            <FlaskConical className="size-3 text-sanitize" /> Simulated capability
          </>
        )}
      </div>
      <pre
        className={cn(
          "max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.72rem] leading-relaxed",
          step.isError ? "text-quarantine" : "text-foreground/80",
        )}
      >
        {step.content}
      </pre>
    </div>
  );
}

function RiskDetail({ result }: { result: GuardianVerdictPayload }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-background/40 p-3">
      <RiskMeter score={result.riskScore} size={64} />
      <div className="min-w-0 flex-1 space-y-1.5">
        {result.signals.length === 0 ? (
          <p className="text-xs text-muted">No detector fired - clean traffic.</p>
        ) : (
          result.signals.map((s, i) => {
            const sc = CATEGORIES[s.category];
            return (
              <div key={i} className="flex items-center gap-2">
                <sc.icon className="size-3 shrink-0" style={{ color: sc.hex }} />
                <span className="flex-1 truncate text-xs text-muted">{s.detector}</span>
                <span className="font-mono text-xs" style={{ color: sc.hex }}>
                  {Math.round(s.score)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function VerdictDetail({ result }: { result: GuardianVerdictPayload }) {
  const v = VERDICTS[result.verdict];
  const evidence = result.evidence ?? [];
  return (
    <div className={cn("space-y-3 rounded-lg border p-3", v.bg, v.border)}>
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={result.verdict} size="md" />
        <span className="text-xs text-muted">{CATEGORIES[result.category].label}</span>
      </div>

      {evidence.length > 0 && (
        <div>
          <div className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-subtle">
            Evidence - what Guardian found
          </div>
          <div className="space-y-1.5">
            {evidence.map((e, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/50 p-2">
                <div className="flex items-start justify-between gap-2">
                  <code className="min-w-0 flex-1 break-words font-mono text-xs text-block">
                    “{e.indicator}”
                  </code>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-medium",
                      e.confidence === "High"
                        ? "bg-block/15 text-block"
                        : e.confidence === "Medium"
                          ? "bg-quarantine/15 text-quarantine"
                          : "bg-surface text-subtle",
                    )}
                  >
                    {e.confidence}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[0.65rem] text-subtle">
                  <span>{CATEGORIES[e.category]?.label ?? e.category}</span>
                  {e.line != null && (
                    <>
                      <span>·</span>
                      <span>near line {e.line} of the document</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.sanitizedPreview && <SanitizedPreview text={result.sanitizedPreview} />}

      <div>
        <div className="text-[0.65rem] font-medium uppercase tracking-wider text-subtle">Recommended action</div>
        <p className="mt-0.5 text-sm text-foreground">{result.recommendedAction}</p>
      </div>
    </div>
  );
}

function SanitizedPreview({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border border-allow/25 bg-allow/[0.05] p-2.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <ShieldCheck className="size-3.5 shrink-0 text-allow" />
        <span className="flex-1 text-xs font-medium text-foreground">
          Sanitized preview - threat isolated, safe to view
        </span>
        <ChevronDown className={cn("size-3.5 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mb-1.5 mt-2 text-[0.65rem] text-subtle">
              Guardian removed the malicious lines; the rest of the document is shown intact.
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background/60 p-2.5 font-mono text-[0.72rem] leading-relaxed text-foreground/85">
              {text}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
