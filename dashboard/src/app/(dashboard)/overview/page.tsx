"use client";

import * as React from "react";
import Link from "next/link";
import {
  ScanSearch,
  ShieldX,
  ShieldAlert,
  Gauge,
  Activity,
  Server,
  Bot,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/dashboard/primitives";
import { TrafficChart, VerdictBreakdown, CategoryDonut } from "@/components/dashboard/charts";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { EventDetail } from "@/components/dashboard/event-detail";
import { Button } from "@/components/ui/button";
import { useTelemetry, selectTrafficDeltas } from "@/features/telemetry/store";
import { SEVERITY_META, CATEGORIES } from "@/lib/constants";
import { formatCompact, formatNumber } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { GuardianEvent } from "@/lib/types";

export default function OverviewPage() {
  const stats     = useTelemetry((s) => s.stats);
  const traffic   = useTelemetry((s) => s.traffic);
  const events    = useTelemetry((s) => s.events);
  const health    = useTelemetry((s) => s.health);
  const incidents = useTelemetry((s) => s.incidents);
  const [selected, setSelected] = React.useState<GuardianEvent | null>(null);

  // Real delta values derived from the traffic time-series (first half vs
  // second half of the 24-hour window). Null when there is not enough data.
  const {
    inspectedDelta,
    blockedDelta,
    quarantinedDelta,
  } = selectTrafficDeltas(traffic);

  // Compute avg risk score delta: compare mean of last 12 events vs prior 12.
  const riskDelta = React.useMemo(() => {
    if (events.length < 4) return null;
    const mid = Math.floor(events.length / 2);
    const recent = events.slice(0, mid);
    const older  = events.slice(mid);
    const mean = (arr: GuardianEvent[]) =>
      arr.reduce((s, e) => s + e.riskScore, 0) / arr.length;
    const cur = mean(recent);
    const old = mean(older);
    if (old === 0) return null;
    return Math.round(((cur - old) / old) * 1000) / 10;
  }, [events]);

  const spark      = traffic.slice(-10).map((p) => p.inspected);
  const blockSpark = traffic.slice(-10).map((p) => p.blocked);

  return (
    <>
      <PageHeader
        title="Security Overview"
        description="Real-time posture across every agent and MCP tool under Guardian."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/monitoring">
              Live monitoring
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Messages inspected"
          value={formatCompact(stats.inspected)}
          icon={ScanSearch}
          accent="primary"
          delta={inspectedDelta != null ? { value: inspectedDelta } : undefined}
          spark={spark}
        />
        <StatCard
          index={1}
          label="Threats blocked"
          value={formatNumber(stats.blocked)}
          icon={ShieldX}
          accent="block"
          delta={blockedDelta != null ? { value: blockedDelta, positiveIsGood: false } : undefined}
          spark={blockSpark}
        />
        <StatCard
          index={2}
          label="Quarantined"
          value={formatNumber(stats.quarantined)}
          icon={ShieldAlert}
          accent="quarantine"
          delta={quarantinedDelta != null ? { value: quarantinedDelta, positiveIsGood: false } : undefined}
        />
        <StatCard
          index={3}
          label="Avg. risk score"
          value={stats.avgRiskScore}
          icon={Gauge}
          accent="sanitize"
          delta={riskDelta != null ? { value: riskDelta, positiveIsGood: false } : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Traffic & threats"
          description="Messages inspected vs. blocked over the last 24 hours"
          className="lg:col-span-2"
          action={<LiveDot />}
        >
          <TrafficChart data={traffic} />
        </Panel>
        <Panel title="Verdict distribution" description="Across recent traffic">
          <VerdictBreakdown events={events} />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <MiniStat icon={Bot}      label="Active agents" value={stats.activeAgents} />
            <MiniStat icon={Server}   label="MCP servers"   value={stats.connectedServers} />
            <MiniStat icon={Activity} label="Avg latency"   value={`${stats.avgLatencyMs}ms`} />
            <MiniStat icon={ShieldX}  label="Block rate"    value={`${stats.blockRate}%`} />
          </div>
        </Panel>
      </div>

      {/* Feed + side panels */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" contentClassName="p-0">
          <div className="h-[440px]">
            <LiveFeed events={events} onSelect={setSelected} />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Threat categories" description="Detected threat mix">
            <CategoryDonut events={events} />
          </Panel>

          <Panel title="System health" description="Detector & service status">
            {health.length === 0 ? (
              <p className="text-xs text-subtle">Connecting…</p>
            ) : (
              <div className="space-y-2.5">
                {health.map((c) => (
                  <div key={c.name} className="flex items-center gap-2.5">
                    <CircleDot
                      className="size-3.5 shrink-0"
                      style={{
                        color:
                          c.status === "operational"
                            ? "var(--allow)"
                            : c.status === "degraded"
                              ? "var(--sanitize)"
                              : "var(--block)",
                      }}
                    />
                    <span className="flex-1 truncate text-sm text-foreground">{c.name}</span>
                    {c.latencyMs > 0 && (
                      <span className="font-mono text-xs text-subtle">{c.latencyMs}ms</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Incidents */}
      <div className="mt-4">
        <Panel
          title="Recent incidents"
          description="High-risk events promoted for review"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/threats">View all</Link>
            </Button>
          }
          contentClassName="p-0"
        >
          {incidents.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={ShieldX}
                title="No incidents"
                description="Guardian hasn't promoted any high-risk events yet."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {incidents.slice(0, 5).map((inc, index) => {
                const cat = CATEGORIES[inc.category];
                const sev = SEVERITY_META[inc.severity];
                return (
                  <div
                    key={`${inc.id}-${inc.timestamp}-${inc.title}-${index}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface/40"
                  >
                    <span
                      className="flex size-8 items-center justify-center rounded-lg"
                      style={{
                        background: `color-mix(in oklch, ${cat.hex} 14%, transparent)`,
                        color: cat.hex,
                      }}
                    >
                      <cat.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {inc.title}
                      </p>
                      <p className="font-mono text-[0.7rem] text-subtle">
                        {inc.source} ·{" "}
                        {formatDistanceToNow(new Date(inc.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <span
                      className="hidden rounded-full px-2 py-0.5 text-[0.7rem] font-medium capitalize sm:inline"
                      style={{
                        color: sev.hex,
                        background: `color-mix(in oklch, ${sev.hex} 12%, transparent)`,
                      }}
                    >
                      {inc.severity}
                    </span>
                    <span className="w-16 text-right font-mono text-sm text-foreground">
                      {inc.riskScore}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <EventDetail event={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-muted">
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-sm font-semibold tabular-nums text-foreground">{value}</div>
        <div className="text-[0.7rem] text-subtle">{label}</div>
      </div>
    </div>
  );
}

function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-allow" />
      </span>
      Live
    </span>
  );
}
