"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine, Radio, Gauge } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard/primitives";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { EventDetail } from "@/components/dashboard/event-detail";
import { RadialGauge, VerdictStackChart } from "@/components/dashboard/charts";
import { useTelemetry } from "@/features/telemetry/store";
import { CHART_COLORS } from "@/lib/constants";
import { formatCompact } from "@/lib/utils";
import type { GuardianEvent } from "@/lib/types";

export default function MonitoringPage() {
  const events = useTelemetry((s) => s.events);
  const traffic = useTelemetry((s) => s.traffic);
  const stats = useTelemetry((s) => s.stats);
  const [selected, setSelected] = React.useState<GuardianEvent | null>(null);

  const inbound = events.filter((e) => e.direction === "inbound").length;
  const outbound = events.filter((e) => e.direction === "outbound").length;
  const total = events.length || 1;
  const threatPct = Math.round(
    (events.filter((e) => e.category !== "benign").length / total) * 100,
  );

  return (
    <>
      <PageHeader
        title="Live Monitoring"
        description="Real-time bidirectional inspection across the wire."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard index={0} label="Inspected" value={formatCompact(stats.inspected)} icon={Radio} accent="primary" />
            <StatCard index={1} label="Inbound" value={inbound} icon={ArrowDownToLine} accent="primary" />
            <StatCard index={2} label="Outbound" value={outbound} icon={ArrowUpFromLine} accent="quarantine" />
            <StatCard index={3} label="Avg latency" value={`${stats.avgLatencyMs}ms`} icon={Gauge} accent="allow" />
          </div>

          <Panel contentClassName="p-0">
            <div className="h-[560px]">
              <LiveFeed events={events} onSelect={setSelected} max={60} />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Threat pressure" description="Share of traffic flagged">
            <RadialGauge value={threatPct} label="flagged" color={CHART_COLORS.block} />
          </Panel>

          <Panel title="Verdict throughput" description="Per hour, stacked">
            <VerdictStackChart data={traffic.slice(-10)} height={200} />
          </Panel>

          <Panel title="Direction split">
            <DirectionSplit inbound={inbound} outbound={outbound} />
          </Panel>
        </div>
      </div>

      <EventDetail event={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function DirectionSplit({ inbound, outbound }: { inbound: number; outbound: number }) {
  const total = inbound + outbound || 1;
  const inPct = Math.round((inbound / total) * 100);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-primary" style={{ width: `${inPct}%` }} />
        <div className="bg-accent-violet" style={{ width: `${100 - inPct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-full bg-primary" /> Inbound {inPct}%
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          Outbound {100 - inPct}% <span className="size-2 rounded-full bg-accent-violet" />
        </span>
      </div>
    </div>
  );
}
