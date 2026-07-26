"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  FileJson,
  Printer,
  ShieldX,
  ScanSearch,
  Gauge,
  Clock,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import { CategoryDonut } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { useTelemetry } from "@/features/telemetry/store";
import { CATEGORIES, SEVERITY_META } from "@/lib/constants";
import { exportEventsCSV, exportJSON } from "@/lib/export";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const REPORTS = [
  {
    id: "exec",
    title: "Executive Security Summary",
    desc: "High-level posture, threat mix, and block rate for leadership.",
    cadence: "Daily",
  },
  {
    id: "incident",
    title: "Incident Response Report",
    desc: "Every high-severity event with evidence and recommended actions.",
    cadence: "On demand",
  },
  {
    id: "compliance",
    title: "Compliance & Audit Trail",
    desc: "Full inspection log formatted for SOC 2 / ISO 27001 review.",
    cadence: "Monthly",
  },
];

export default function ReportsPage() {
  const stats = useTelemetry((s) => s.stats);
  const events = useTelemetry((s) => s.events);
  const incidents = useTelemetry((s) => s.incidents);

  const buildSummary = () => ({
    generatedAt: new Date().toISOString(),
    window: "last 24h",
    stats,
    topCategories: Array.from(
      events
        .filter((e) => e.category !== "benign")
        .reduce((m, e) => m.set(e.category, (m.get(e.category) ?? 0) + 1), new Map<string, number>())
        .entries(),
    )
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    openIncidents: incidents.filter((i) => i.status === "open").length,
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and export security reports for any audience."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportEventsCSV(events)}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                exportJSON(buildSummary(), "summary");
                toast.success("Summary exported", { description: "JSON downloaded." });
              }}
            >
              <FileJson className="size-3.5" /> JSON
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print / PDF
            </Button>
          </>
        }
      />

      {/* Executive summary card */}
      <Panel
        title="Executive summary"
        description={`Guardian activity · generated ${format(new Date(), "MMM d, yyyy · HH:mm")}`}
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryStat icon={ScanSearch} label="Inspected" value={formatNumber(stats.inspected)} accent="var(--primary)" />
          <SummaryStat icon={ShieldX} label="Blocked" value={formatNumber(stats.blocked)} accent="var(--block)" />
          <SummaryStat icon={Gauge} label="Avg risk" value={String(stats.avgRiskScore)} accent="var(--sanitize)" />
          <SummaryStat icon={Clock} label="Avg latency" value={`${stats.avgLatencyMs}ms`} accent="var(--allow)" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-border pt-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Threat category mix</h4>
            <CategoryDonut events={events} height={200} />
          </div>
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Severity distribution</h4>
            <SeverityBars events={events} />
          </div>
        </div>
      </Panel>

      {/* Report types */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {REPORTS.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Panel className="h-full">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary-bright">
                <FileText className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full border border-border bg-surface/50 px-2.5 py-1 text-xs text-muted">
                  {r.cadence}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    exportJSON({ report: r.id, ...buildSummary() }, r.id);
                    toast.success(`${r.title} generated`);
                  }}
                >
                  Generate
                  <Download className="size-3.5" />
                </Button>
              </div>
            </Panel>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ShieldX;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklch, ${accent} 14%, transparent)`, color: accent }}>
        <Icon className="size-4" />
      </span>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-subtle">{label}</div>
    </div>
  );
}

function SeverityBars({ events }: { events: Parameters<typeof CategoryDonut>[0]["events"] }) {
  const counts = (["critical", "high", "medium", "low"] as const).map((sev) => ({
    sev,
    count: events.filter((e) => e.category !== "benign" && e.severity === sev).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <div className="space-y-3">
      {counts.map(({ sev, count }) => {
        const meta = SEVERITY_META[sev];
        return (
          <div key={sev}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="capitalize text-muted">{meta.label}</span>
              <span className="font-mono text-foreground">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(count / max) * 100}%`, background: meta.hex }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
