"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Bot,
  Server,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize,
  Play,
  Activity,
  Layers,
  Flame,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import { GuardianMark } from "@/components/brand/logo";
import { useTelemetry } from "@/features/telemetry/store";
import { cn, createListKey } from "@/lib/utils";
import {
  fetchAttackChains,
  simulateAttackChain,
  type AttackChainData,
  type AttackChainNode,
  type AttackChainEdge,
  type AttackChainHop,
} from "@/lib/api/guardian";

/* ------------------------------------------------------------------ *
 * Multi-Tool Attack Chain Propagation Graph
 * Challenge Feature for Team Mutex (RH-0045) — RUSH HOUR Hackathon.
 *
 * Correlates multi-hop AI tool calls & cross-session payloads to detect
 * indirect prompt injections, vault credential harvesting, and external
 * data exfiltration streams in real time.
 * ------------------------------------------------------------------ */

type Kind = "user" | "agent" | "guardian" | "tool";
type Risk = "clean" | "warning" | "danger";

interface PositionedNode extends AttackChainNode {
  x: number;
  y: number;
}

const NW = 176;
const NH = 60;
const GW = 132;
const GH = 108;
const CANVAS_W = 1108;
const CANVAS_H = 470;

const DEFAULT_NODES: PositionedNode[] = [
  { id: "u1", label: "User / Session", sub: "RH-0045 Client", kind: "user", x: 40, y: 90, risk: "warning" },
  { id: "a1", label: "research-agent", sub: "claude-3.5-sonnet", kind: "agent", x: 320, y: 190, risk: "danger" },
  { id: "g1", label: "Guardian Firewall", sub: "Multi-Tool Correlator", kind: "guardian", x: 640, y: 186, risk: "clean" },
  { id: "t1", label: "filesystem-mcp", sub: "read_document", kind: "tool", x: 900, y: 50, risk: "warning" },
  { id: "t2", label: "vault-mcp", sub: "vault_read", kind: "tool", x: 900, y: 190, risk: "danger" },
  { id: "t3", label: "webhook-gateway", sub: "send_notification", kind: "tool", x: 900, y: 330, risk: "danger" },
];

const DEFAULT_EDGES: AttackChainEdge[] = [
  { from: "u1", to: "a1", threat: false, label: "user prompt" },
  { from: "a1", to: "g1", threat: true, label: "tool sequence" },
  { from: "g1", to: "t1", threat: true, label: "Step 1: Poisoned Read" },
  { from: "g1", to: "t2", threat: true, label: "Step 2: Vault Creds" },
  { from: "g1", to: "t3", threat: true, label: "Step 3: Exfil Relay" },
];

function dims(n: AttackChainNode) {
  return n.kind === "guardian" ? { w: GW, h: GH } : { w: NW, h: NH };
}

function outPoint(n: PositionedNode) {
  const d = dims(n);
  return { x: n.x + d.w, y: n.y + d.h / 2 };
}

function inPoint(n: PositionedNode) {
  const d = dims(n);
  return { x: n.x, y: n.y + d.h / 2 };
}

function layoutNodes(nodes: AttackChainNode[]): PositionedNode[] {
  if (!nodes || nodes.length === 0) return DEFAULT_NODES;

  const users = nodes.filter((n) => n.kind === "user");
  const agents = nodes.filter((n) => n.kind === "agent");
  const guardians = nodes.filter((n) => n.kind === "guardian");
  const tools = nodes.filter((n) => n.kind === "tool");

  const layoutCol = (list: AttackChainNode[], x: number) => {
    const total = list.length;
    const spacing = CANVAS_H / (total + 1);
    return list.map((n, i) => ({
      ...n,
      x,
      y: Math.max(20, Math.min(CANVAS_H - 80, (i + 1) * spacing - 30)),
    }));
  };

  const posUsers = layoutCol(users, 40);
  const posAgents = layoutCol(agents, 320);
  const posGuardians = guardians.map((n) => ({ ...n, x: 640, y: 186 }));
  const posTools = layoutCol(tools, 900);

  return [...posUsers, ...posAgents, ...posGuardians, ...posTools];
}

export default function GraphPage() {
  const blockedStats = useTelemetry((s) => s.stats.blocked);
  const [chains, setChains] = React.useState<AttackChainData[]>([]);
  const [selectedChainId, setSelectedChainId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [simulating, setSimulating] = React.useState(false);
  const [hover, setHover] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [wsConnected, setWsConnected] = React.useState(false);

  // Fetch initial chains from backend
  const loadChains = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAttackChains();
      if (res && res.chains && res.chains.length > 0) {
        setChains(res.chains);
        if (!selectedChainId) {
          setSelectedChainId(res.chains[0].id);
        }
      }
    } catch {
      // Fallback local chain if backend endpoint offline
      const fallback: AttackChainData = {
        id: "chain-rh-0045-demo",
        title: "Multi-Tool Exfiltration Sequence (Poisoned File → Vault → Relay)",
        sessionId: "session-rh0045",
        patternType: "INDIRECT_INJECTION_EXFILTRATION",
        riskScore: 94.5,
        confidence: 0.96,
        status: "contained",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hops: [
          { step: 1, timestamp: "Just now", tool: "read_document", source: "research-agent", target: "filesystem-mcp", category: "encoded_payload", verdict: "QUARANTINE", riskScore: 50.0, summary: "Poisoned vendor-config.txt with hidden base64 payload." },
          { step: 2, timestamp: "Just now", tool: "vault_read", source: "research-agent", target: "vault-mcp", category: "prompt_injection", verdict: "BLOCK", riskScore: 92.9, summary: "Follow-up instruction attempted credential read from vault-mcp." },
          { step: 3, timestamp: "Just now", tool: "send_notification", source: "research-agent", target: "webhook-gateway", category: "pii_leakage", verdict: "BLOCK", riskScore: 98.0, summary: "Exfiltration of recovered tokens out of trust boundary." },
        ],
        nodes: DEFAULT_NODES,
        edges: DEFAULT_EDGES,
      };
      setChains([fallback]);
      setSelectedChainId(fallback.id);
    } finally {
      setLoading(false);
    }
  }, [selectedChainId]);

  React.useEffect(() => {
    loadChains();
  }, [loadChains]);

  // Connect WebSocket for real-time attack chain streaming
  React.useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, "")
        : "localhost:8000";
      ws = new WebSocket(`${protocol}//${host}/ws/chains`);

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);

      ws.onmessage = (event) => {
        try {
          const newChain: AttackChainData = JSON.parse(event.data);
          setChains((prev) => {
            const exists = prev.some((c) => c.id === newChain.id);
            if (exists) {
              return prev.map((c) => (c.id === newChain.id ? newChain : c));
            }
            return [newChain, ...prev];
          });
          setSelectedChainId(newChain.id);
        } catch {
          // Ignore bad payload
        }
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await simulateAttackChain();
      if (res && res.chain) {
        setChains((prev) => [res.chain, ...prev.filter((c) => c.id !== res.chain.id)]);
        setSelectedChainId(res.chain.id);
      }
    } catch {
      // Client-side fallback simulation if offline
      const simId = `chain-sim-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();
      const simChain: AttackChainData = {
        id: simId,
        title: "Live Demo: Poisoned Read → Vault Access → Webhook Exfiltration",
        sessionId: "session-judge-demo",
        patternType: "MULTI_TOOL_INDIRECT_INJECTION_EXFIL",
        riskScore: 98.0,
        confidence: 0.98,
        status: "contained",
        createdAt: now,
        updatedAt: now,
        hops: [
          { step: 1, timestamp: "00:00.1", tool: "read_document", source: "research-agent", target: "filesystem-mcp", category: "encoded_payload", verdict: "QUARANTINE", riskScore: 50.0, summary: "Poisoned document read contains system override payload." },
          { step: 2, timestamp: "00:00.3", tool: "vault_read", source: "research-agent", target: "vault-mcp", category: "prompt_injection", verdict: "BLOCK", riskScore: 92.9, summary: "Attacker attempts to extract DB credentials from vault." },
          { step: 3, timestamp: "00:00.5", tool: "send_notification", source: "research-agent", target: "webhook-gateway", category: "pii_leakage", verdict: "BLOCK", riskScore: 98.0, summary: "Exfiltration payload intercepted before dispatch." },
        ],
        nodes: [
          { id: "sim-u1", label: "Judge Demo Session", sub: "RH-0045", kind: "user", risk: "warning" },
          { id: "sim-a1", label: "research-agent", sub: "claude-3.5-sonnet", kind: "agent", risk: "danger" },
          { id: "sim-g1", label: "Guardian Firewall", sub: "Correlator Engine", kind: "guardian", risk: "clean" },
          { id: "sim-t1", label: "filesystem-mcp", sub: "read_document", kind: "tool", risk: "warning" },
          { id: "sim-t2", label: "vault-mcp", sub: "vault_read", kind: "tool", risk: "danger" },
          { id: "sim-t3", label: "webhook-gateway", sub: "send_notification", kind: "tool", risk: "danger" },
        ],
        edges: [
          { from: "sim-u1", to: "sim-a1", threat: false, label: "user prompt" },
          { from: "sim-a1", to: "sim-g1", threat: true, label: "tool sequence" },
          { from: "sim-g1", to: "sim-t1", threat: true, label: "Step 1: Read Poisoned Doc" },
          { from: "sim-g1", to: "sim-t2", threat: true, label: "Step 2: Read Vault Creds" },
          { from: "sim-g1", to: "sim-t3", threat: true, label: "Step 3: Exfil Webhook" },
        ],
      };
      setChains((prev) => [simChain, ...prev]);
      setSelectedChainId(simId);
    } finally {
      setTimeout(() => setSimulating(false), 400);
    }
  };

  const currentChain = chains.find((c) => c.id === selectedChainId) || chains[0];
  const activeNodes = React.useMemo(() => layoutNodes(currentChain?.nodes || []), [currentChain]);
  const activeEdges = currentChain?.edges || DEFAULT_EDGES;

  const nodeMap = React.useMemo(() => {
    const map: Record<string, PositionedNode> = {};
    activeNodes.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [activeNodes]);

  const edgeActive = (e: AttackChainEdge) =>
    hover === null || hover === e.from || hover === e.to;

  return (
    <>
      <PageHeader
        title="Multi-Tool Attack Chain Detection Graph"
        description="Real-time graph correlation of cross-tool AI payloads, indirect prompt injections, and data exfiltration sessions."
      />

      {/* ── Challenge Feature Banner — Team Mutex (RH-0045) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-surface/60 to-block/15 p-5 backdrop-blur-xl shadow-lg"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-bright shadow-[0_0_20px_-3px_var(--primary)]">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/25 px-3 py-0.5 text-xs font-semibold text-primary-bright">
                  <Radio className="size-3.5 animate-ping text-allow" />
                  RUSH HOUR 2026 ASSIGNED CHALLENGE
                </span>
                <span className="rounded-full bg-surface border border-border px-2.5 py-0.5 font-mono text-xs font-medium text-foreground">
                  Team Mutex · RH-0045
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-allow/15 px-2.5 py-0.5 text-xs font-semibold text-allow">
                  <CheckCircle2 className="size-3" />
                  UNLOCKED & ACTIVE
                </span>
              </div>
              <h2 className="mt-2 text-base font-bold text-foreground">
                Multi-Tool Attack Chain Detection Engine
              </h2>
              <p className="mt-1 text-xs text-subtle leading-relaxed max-w-4xl">
                Correlates suspicious activities across multiple AI tool calls and sessions to detect coordinated prompt-injection and data-exfiltration attacks that single-request analysis cannot identify.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/20 px-4 py-2 text-xs font-bold text-primary-bright transition-all hover:bg-primary/30 hover:shadow-[0_0_20px_-4px_var(--primary)] active:scale-95 disabled:opacity-50"
            >
              <Play className={cn("size-3.5 fill-current", simulating && "animate-spin")} />
              {simulating ? "Correlating Attack Chain…" : "Simulate Multi-Tool Attack (RH-0045)"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Main Graph Panel ── */}
      <Panel contentClassName="p-0">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary-bright" />
              <span className="font-semibold text-foreground">Active Chain:</span>
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <Legend color="var(--primary)" label="Clean Flow" />
            <Legend color="var(--block)" label="Correlated Threat Chain" />
            <Legend color="var(--quarantine)" label="At-Risk Hop" />
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-muted font-mono">
              <span
                className={cn(
                  "size-2 rounded-full",
                  wsConnected ? "bg-allow animate-pulse" : "bg-quarantine"
                )}
              />
              {wsConnected ? "WS Correlator Live" : "REST Polling"}
            </span>

            <span className="flex items-center gap-1.5 font-semibold text-allow">
              <ShieldCheck className="size-4 text-allow" />
              {blockedStats} attacks contained
            </span>
          </div>
        </div>

        {/* Dynamic Graph Canvas */}
        <div className="relative h-[540px] w-full overflow-hidden bg-dots">
          {/* Zoom controls */}
          <div className="absolute right-4 top-4 z-20 flex flex-col gap-1 rounded-lg border border-border bg-card/80 p-1 backdrop-blur">
            <IconBtn onClick={() => setZoom((z) => Math.min(z + 0.15, 1.6))} label="Zoom in">
              <ZoomIn className="size-4" />
            </IconBtn>
            <IconBtn onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))} label="Zoom out">
              <ZoomOut className="size-4" />
            </IconBtn>
            <IconBtn onClick={() => setZoom(1)} label="Reset">
              <Maximize className="size-4" />
            </IconBtn>
          </div>

          <div
            className="absolute left-1/2 top-1/2 origin-center transition-transform duration-300"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `translate(-50%, -50%) scale(${zoom})`,
            }}
          >
            {/* SVG Edges */}
            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              className="absolute inset-0 overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="edge-clean" x1="0" x2="1">
                  <stop offset="0" stopColor="color-mix(in oklch, var(--primary) 20%, transparent)" />
                  <stop offset="1" stopColor="var(--primary)" />
                </linearGradient>
                <linearGradient id="edge-threat" x1="0" x2="1">
                  <stop offset="0" stopColor="color-mix(in oklch, var(--block) 30%, transparent)" />
                  <stop offset="1" stopColor="var(--block)" />
                </linearGradient>
              </defs>

              {activeEdges.map((e, idx) => {
                const fromNode = nodeMap[e.from];
                const toNode = nodeMap[e.to];
                if (!fromNode || !toNode) return null;

                const a = outPoint(fromNode);
                const b = inPoint(toNode);
                const midX = (a.x + b.x) / 2;
                const d = `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
                const active = edgeActive(e);

                return (
                  <g key={`${e.from}-${e.to}-${idx}`} style={{ opacity: active ? 1 : 0.15, transition: "opacity 0.25s" }}>
                    <path
                      d={d}
                      fill="none"
                      stroke={e.threat ? "url(#edge-threat)" : "url(#edge-clean)"}
                      strokeWidth={e.threat ? 2.5 : 1.5}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={e.threat ? "var(--block)" : "var(--primary-bright)"}
                      strokeWidth={e.threat ? 3 : 2}
                      strokeLinecap="round"
                      strokeDasharray="5 10"
                      className="[animation:dash_1.2s_linear_infinite]"
                      style={{ opacity: 0.9 }}
                    />
                    {e.label && (
                      <g transform={`translate(${midX}, ${(a.y + b.y) / 2 - 8})`}>
                        <rect
                          x={-e.label.length * 3.5 - 6}
                          y="-10"
                          width={e.label.length * 7 + 12}
                          height="18"
                          rx="4"
                          fill="var(--card)"
                          stroke={e.threat ? "var(--block)" : "var(--border)"}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="2"
                          textAnchor="middle"
                          className={cn("text-[10px] font-mono font-semibold", e.threat ? "fill-block" : "fill-primary-bright")}
                        >
                          {e.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {activeNodes.map((n, index) => (
              <NodeCard
                key={createListKey(n, index)}
                node={n}
                dimmed={hover !== null && hover !== n.id && !isNeighbor(n.id, hover, activeEdges)}
                onHover={setHover}
              />
            ))}
          </div>

          <style>{`@keyframes dash { to { stroke-dashoffset: -28; } }`}</style>
        </div>
      </Panel>

      {/* ── Correlation Details & Hop-by-Hop Breakdown ── */}
      {currentChain && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Summary Stats Card */}
          <Panel title="Correlated Threat Metadata" className="lg:col-span-1">
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-subtle">Session ID</span>
                <span className="font-mono font-semibold text-foreground">{currentChain.sessionId}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-subtle">Pattern Classification</span>
                <span className="rounded-full bg-block/15 px-2.5 py-0.5 font-mono text-[0.7rem] font-bold text-block">
                  {currentChain.patternType}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-subtle">Correlated Risk Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full bg-gradient-to-r from-quarantine to-block"
                      style={{ width: `${currentChain.riskScore}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-block">{currentChain.riskScore.toFixed(1)} / 100</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-subtle">Detection Confidence</span>
                <span className="font-mono font-semibold text-allow">{((currentChain.confidence || 0.95) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-subtle">Containment Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-allow">
                  <ShieldCheck className="size-3.5" />
                  {currentChain.status.toUpperCase()}
                </span>
              </div>
            </div>
          </Panel>

          {/* Hop-by-Hop Attack Vector Sequence */}
          <Panel title="Correlated Attack Vector Sequence (Multi-Hop)" className="lg:col-span-2">
            <div className="space-y-3">
              {currentChain.hops && currentChain.hops.length > 0 ? (
                currentChain.hops.map((hop) => (
                  <div
                    key={hop.step}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3.5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 font-mono text-[0.7rem] font-bold text-primary-bright">
                          #{hop.step}
                        </span>
                        <span className="font-mono font-semibold text-foreground">{hop.tool}</span>
                        <span className="text-subtle">({hop.source} → {hop.target})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded bg-surface px-2 py-0.5 font-mono text-[0.65rem] text-subtle">
                          {hop.category}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 font-mono text-[0.65rem] font-bold",
                            hop.verdict === "BLOCK"
                              ? "bg-block/20 text-block"
                              : hop.verdict === "QUARANTINE"
                              ? "bg-quarantine/20 text-quarantine"
                              : "bg-allow/20 text-allow"
                          )}
                        >
                          {hop.verdict}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted leading-relaxed pl-8">
                      {hop.summary}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-subtle">
                  No multi-tool hops registered for this chain.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

function isNeighbor(id: string, other: string, edges: AttackChainEdge[]) {
  return edges.some(
    (e) => (e.from === id && e.to === other) || (e.to === id && e.from === other)
  );
}

function NodeCard({
  node,
  dimmed,
  onHover,
}: {
  node: PositionedNode;
  dimmed: boolean;
  onHover: (id: string | null) => void;
}) {
  const d = dims(node);
  const Icon = node.kind === "user" ? Users : node.kind === "agent" ? Bot : Server;
  const risk = node.risk ?? "clean";
  const ring =
    risk === "danger"
      ? "border-block/60 shadow-[0_0_28px_-6px_var(--block)]"
      : risk === "warning"
      ? "border-quarantine/50 shadow-[0_0_22px_-8px_var(--quarantine)]"
      : "border-border";
  const iconColor =
    risk === "danger" ? "var(--block)" : risk === "warning" ? "var(--quarantine)" : "var(--primary-bright)";

  if (node.kind === "guardian") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: dimmed ? 0.4 : 1, scale: 1 }}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        className="glow-primary absolute flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-primary/40 bg-primary/10 backdrop-blur"
        style={{ left: node.x, top: node.y, width: d.w, height: d.h }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className="animate-scan absolute inset-x-0 h-10 opacity-60"
            style={{ background: "linear-gradient(to bottom, transparent, color-mix(in oklch, var(--primary) 30%, transparent), transparent)" }}
          />
        </div>
        <GuardianMark className="size-8" animated />
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">Guardian</div>
          <div className="text-[0.65rem] font-mono text-primary-bright">{node.sub}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "absolute flex cursor-pointer items-center gap-3 rounded-xl border bg-card/90 px-3.5 backdrop-blur-sm",
        ring
      )}
      style={{ left: node.x, top: node.y, width: d.w, height: d.h }}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface" style={{ color: iconColor }}>
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{node.label}</div>
        <div className="truncate font-mono text-[0.65rem] text-subtle">{node.sub}</div>
      </div>
      {risk === "danger" && (
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-block opacity-70" />
          <span className="relative inline-flex size-3 rounded-full bg-block" />
        </span>
      )}
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
