"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  Wrench,
  Gauge,
  AlertTriangle,
  Timer,
  Server,
  Radio,
  Wifi,
  FlaskConical,
  PanelRightClose,
} from "lucide-react";
import { useTelemetry } from "@/features/telemetry/store";
import { useChat, selectSessionActivity } from "@/features/chat/store";
import type { PipelineStep } from "@/features/chat/types";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Tools actually available to the chat agent, with honest live/simulated status. */
const CHAT_TOOLS: { name: string; live: boolean }[] = [
  { name: "read_document", live: true },
  { name: "list_documents", live: true },
  { name: "web_search", live: false },
  { name: "send_notification", live: false },
];

/** Pull the live tool + latest risk from the active streaming assistant turn. */
function useActiveTurn() {
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const sending = useChat((s) => s.sending);

  const convo = conversations.find((c) => c.id === activeId);
  const lastAssistant = [...(convo?.messages ?? [])].reverse().find((m) => m.role === "assistant");
  const steps: PipelineStep[] = lastAssistant?.steps ?? [];

  const toolStep = [...steps].reverse().find((s) => s.kind === "tool_call") as
    | Extract<PipelineStep, { kind: "tool_call" }>
    | undefined;
  const scanStep = [...steps].reverse().find(
    (s) => (s.kind === "guardian_scan" || s.kind === "inbound_scan") && s.result,
  ) as Extract<PipelineStep, { kind: "guardian_scan" | "inbound_scan" }> | undefined;

  return {
    sending,
    currentTool: sending ? toolStep?.tool ?? null : null,
    risk: scanStep?.result?.riskScore ?? null,
    verdict: scanStep?.result?.verdict ?? null,
  };
}

export function LiveRail({ onCollapse }: { onCollapse?: () => void }) {
  const connection = useTelemetry((s) => s.connection);
  const conversations = useChat((s) => s.conversations);
  const session = React.useMemo(() => selectSessionActivity(conversations), [conversations]);
  const { sending, currentTool, risk, verdict } = useActiveTurn();

  const live = connection === "live";

  return (
    <div className="flex h-full w-[320px] flex-col border-l border-border bg-surface/30">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
        <Activity className="size-4 text-primary-bright" />
        <span className="text-sm font-semibold text-foreground">Live status</span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="ml-auto rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Collapse panel"
          >
            <PanelRightClose className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Guardian status */}
        <Section title="Guardian">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <ShieldCheck className="size-4 text-allow" />
              Protection active
            </span>
            <ConnBadge live={live} connection={connection} />
          </div>
        </Section>

        {/* Current turn */}
        <Section title="Current request">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat
              icon={Wrench}
              label="Current tool"
              value={currentTool ? currentTool : sending ? "-" : "Idle"}
              mono={!!currentTool}
              pulse={sending}
            />
            <MiniStat
              icon={Gauge}
              label="Risk score"
              value={risk === null ? "-" : risk.toFixed(0)}
              tone={
                risk === null ? "neutral" : risk >= 75 ? "block" : risk >= 50 ? "warn" : "allow"
              }
            />
          </div>
          {verdict && (
            <div
              className={cn(
                "mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                verdict === "ALLOW"
                  ? "bg-allow/12 text-allow"
                  : verdict === "BLOCK"
                    ? "bg-block/12 text-block"
                    : "bg-quarantine/12 text-quarantine",
              )}
            >
              {verdict === "ALLOW" ? <ShieldCheck className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              Last verdict: {verdict}
            </div>
          )}
        </Section>

        {/* Session metrics - real, from this conversation's turns */}
        <Section title="This session">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon={Activity} label="Inspected" value={String(session.inspected)} />
            <MiniStat icon={AlertTriangle} label="Threats caught" value={String(session.threats)} tone={session.threats ? "block" : "neutral"} />
            <MiniStat icon={Timer} label="Avg latency" value={session.inspected ? `${session.avgLatencyMs}ms` : "-"} />
            <MiniStat icon={Server} label="Tools" value={String(CHAT_TOOLS.length)} />
          </div>
        </Section>

        {/* Recent events - real threats from this conversation */}
        <Section title="Threats in this session">
          {session.threatEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-subtle">
              No threats yet. Try the “poisoned document” prompt to see one appear here.
            </p>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {session.threatEvents.slice(0, 8).map((e) => {
                  const cat = CATEGORIES[e.category];
                  return (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 px-2.5 py-2"
                    >
                      <cat.icon className="size-3.5 shrink-0" style={{ color: cat.hex }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-foreground">{cat.label}</div>
                        <div className="truncate font-mono text-[0.65rem] text-subtle">{e.source}</div>
                      </div>
                      <span className="font-mono text-xs" style={{ color: cat.hex }}>
                        {Math.round(e.riskScore)}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </Section>

        {/* Available tools - honest live vs simulated */}
        <Section title="Available tools">
          <div className="space-y-1.5">
            {CHAT_TOOLS.map((t) => (
              <div key={t.name} className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 px-2.5 py-2">
                {t.live ? (
                  <Wifi className="size-3.5 shrink-0 text-allow" />
                ) : (
                  <FlaskConical className="size-3.5 shrink-0 text-sanitize" />
                )}
                <span className="flex-1 truncate font-mono text-xs text-foreground">{t.name}</span>
                <span className={cn("text-[0.65rem]", t.live ? "text-allow" : "text-sanitize")}>
                  {t.live ? "live" : "simulated"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 px-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-subtle">{title}</h3>
      {children}
    </div>
  );
}

function ConnBadge({ live, connection }: { live: boolean; connection: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[0.65rem] font-medium">
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />}
        <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-allow" : "bg-sanitize")} />
      </span>
      <span className={live ? "text-allow" : "text-sanitize"}>
        {live ? "Live" : connection === "connecting" ? "Connecting" : "Demo"}
      </span>
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  mono = false,
  pulse = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "neutral" | "allow" | "block" | "warn";
  mono?: boolean;
  pulse?: boolean;
}) {
  const toneColor =
    tone === "allow" ? "text-allow" : tone === "block" ? "text-block" : tone === "warn" ? "text-quarantine" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[0.65rem] text-subtle">
        <Icon className="size-3" />
        {label}
      </div>
      <div className={cn("mt-1 flex items-center gap-1.5 text-lg font-semibold tabular-nums", toneColor, mono && "font-mono text-sm")}>
        {pulse && <Radio className="size-3 animate-pulse text-primary-bright" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
