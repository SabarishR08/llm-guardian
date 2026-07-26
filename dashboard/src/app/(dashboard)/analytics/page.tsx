"use client";

import * as React from "react";
import { format } from "date-fns";
import { Bot, Server, Activity } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import {
  RiskTrendChart,
  VerdictStackChart,
  CategoryDonut,
} from "@/components/dashboard/charts";
import { useTelemetry } from "@/features/telemetry/store";
import { CATEGORIES } from "@/lib/constants";
import type { ThreatCategory } from "@/lib/types";
import { cn, createListKey } from "@/lib/utils";

export default function AnalyticsPage() {
  const traffic = useTelemetry((s) => s.traffic);
  const events = useTelemetry((s) => s.events);
  const agents = useTelemetry((s) => s.agents);
  const servers = useTelemetry((s) => s.servers);

  const riskSeries = React.useMemo(
    () =>
      traffic.map((p) => ({
        t: format(new Date(p.t), "HH:mm"),
        risk: Math.min(
          100,
          Math.round(((p.blocked * 90 + p.quarantined * 55 + p.sanitized * 30) / (p.inspected || 1)) + 8),
        ),
      })),
    [traffic],
  );

  const detectorStats = React.useMemo(() => {
    const map = new Map<ThreatCategory, { count: number; sum: number }>();
    for (const e of events) {
      if (e.category === "benign") continue;
      const cur = map.get(e.category) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += e.riskScore;
      map.set(e.category, cur);
    }
    return (Object.keys(CATEGORIES) as ThreatCategory[])
      .filter((k) => k !== "benign")
      .map((k) => {
        const s = map.get(k);
        return {
          category: k,
          count: s?.count ?? 0,
          avg: s ? Math.round(s.sum / s.count) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const maxCount = Math.max(...detectorStats.map((d) => d.count), 1);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Trends, detector performance, and asset risk across the fleet."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Risk score trend" description="Weighted average risk per hour">
          <RiskTrendChart data={riskSeries} />
        </Panel>
        <Panel title="Verdict throughput" description="Stacked verdicts per hour">
          <VerdictStackChart data={traffic} height={220} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Detector performance" description="Detections and mean risk by engine" className="lg:col-span-2">
          <div className="space-y-3">
            {detectorStats.map((d) => {
              const cat = CATEGORIES[d.category];
              return (
                <div key={d.category} className="flex items-center gap-3">
                  <span className="flex w-40 shrink-0 items-center gap-2 text-sm">
                    <cat.icon className="size-4" style={{ color: cat.hex }} />
                    <span className="truncate text-muted">{cat.short}</span>
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(d.count / maxCount) * 100}%`, background: cat.hex }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-foreground">{d.count}</span>
                  <span className="w-16 text-right font-mono text-xs text-subtle">avg {d.avg}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Threat mix">
          <CategoryDonut events={events} height={200} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Connected agents" description="Trust scores and blocked counts" contentClassName="p-0">
          <div className="divide-y divide-border">
            {agents.map((a, index) => (
              <div key={createListKey(a, index)} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-primary-bright">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                    <StatusDot status={a.status} />
                  </div>
                  <span className="font-mono text-[0.7rem] text-subtle">{a.model}</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-subtle">trust</span>
                    <span
                      className={cn(
                        "font-mono text-sm font-medium",
                        a.trustScore >= 70 ? "text-allow" : a.trustScore >= 50 ? "text-sanitize" : "text-block",
                      )}
                    >
                      {a.trustScore}
                    </span>
                  </div>
                  <span className="font-mono text-[0.7rem] text-subtle">{a.blocked} blocked</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="MCP servers" description="Connection status and exposure" contentClassName="p-0">
          <div className="divide-y divide-border">
            {servers.map((s, index) => (
              <div key={createListKey(s, index)} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-foreground">
                  <Server className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                    <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-subtle">
                      {s.transport}
                    </span>
                  </div>
                  <span className="font-mono text-[0.7rem] text-subtle">{s.tools} tools</span>
                </div>
                <ServerStatus status={s.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active" ? "var(--allow)" : status === "quarantined" ? "var(--block)" : "var(--subtle)";
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium capitalize"
      style={{ color, background: `color-mix(in oklch, ${color} 14%, transparent)` }}
    >
      {status}
    </span>
  );
}

function ServerStatus({ status }: { status: string }) {
  const map = {
    connected: { c: "var(--allow)", label: "Connected" },
    connecting: { c: "var(--sanitize)", label: "Connecting" },
    error: { c: "var(--block)", label: "Error" },
  }[status] ?? { c: "var(--subtle)", label: status };
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: map.c }}>
      <Activity className="size-3.5" />
      {map.label}
    </span>
  );
}
