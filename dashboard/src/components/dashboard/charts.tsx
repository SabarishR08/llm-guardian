"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { format } from "date-fns";
import type { MetricPoint, GuardianEvent } from "@/lib/types";
import { CATEGORIES, VERDICTS, CHART_COLORS } from "@/lib/constants";
import { selectCategoryBreakdown, selectVerdictBreakdown } from "@/features/telemetry/store";

const AXIS = { fontSize: 11, fill: "var(--subtle)" };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string;
  formatter?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl glass-strong px-3 py-2 text-xs shadow-xl">
      {label && (
        <div className="mb-1.5 font-medium text-foreground">
          {formatter ? formatter(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="capitalize text-muted">{p.name}</span>
            <span className="ml-auto font-mono font-medium text-foreground">
              {p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ traffic chart ----------------------------- */

export function TrafficChart({ data, height = 280 }: { data: MetricPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="g-allowed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-blocked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.block} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.block} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="t"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickFormatter={(t) => format(new Date(t), "HH:mm")}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          content={<ChartTooltip formatter={(l) => format(new Date(l), "MMM d, HH:mm")} />}
        />
        <Area
          type="monotone"
          dataKey="inspected"
          name="Inspected"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#g-allowed)"
        />
        <Area
          type="monotone"
          dataKey="blocked"
          name="Blocked"
          stroke={CHART_COLORS.block}
          strokeWidth={2}
          fill="url(#g-blocked)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------- verdict stack bars -------------------------- */

export function VerdictStackChart({ data, height = 280 }: { data: MetricPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="t"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickFormatter={(t) => format(new Date(t), "HH:mm")}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "var(--surface)", opacity: 0.4 }}
          content={<ChartTooltip formatter={(l) => format(new Date(l), "MMM d, HH:mm")} />}
        />
        <Bar dataKey="allowed" name="Allowed" stackId="v" fill={CHART_COLORS.allow} radius={[0, 0, 0, 0]} />
        <Bar dataKey="sanitized" name="Sanitized" stackId="v" fill={CHART_COLORS.sanitize} />
        <Bar dataKey="quarantined" name="Quarantined" stackId="v" fill={CHART_COLORS.quarantine} />
        <Bar dataKey="blocked" name="Blocked" stackId="v" fill={CHART_COLORS.block} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ----------------------------- category donut ----------------------------- */

export function CategoryDonut({ events, height = 240 }: { events: GuardianEvent[]; height?: number }) {
  const breakdown = React.useMemo(() => {
    const map = selectCategoryBreakdown(events);
    return Array.from(map.entries())
      .map(([category, count]) => ({
        name: CATEGORIES[category].label,
        value: count,
        color: CATEGORIES[category].hex,
      }))
      .sort((a, b) => b.value - a.value);
  }, [events]);

  const total = breakdown.reduce((a, b) => a + b.value, 0);

  if (!total) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-subtle">
        No threats detected yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={height}>
        <PieChart>
          <Pie
            data={breakdown}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {breakdown.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {breakdown.slice(0, 6).map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="flex-1 truncate text-muted">{d.name}</span>
            <span className="font-mono font-medium text-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- verdict mini bars --------------------------- */

export function VerdictBreakdown({ events }: { events: GuardianEvent[] }) {
  const data = React.useMemo(() => {
    const map = selectVerdictBreakdown(events);
    const total = events.length || 1;
    return (["ALLOW", "SANITIZE", "QUARANTINE", "BLOCK"] as const).map((v) => ({
      verdict: v,
      count: map.get(v) ?? 0,
      pct: Math.round(((map.get(v) ?? 0) / total) * 100),
      color: VERDICTS[v].hex,
    }));
  }, [events]);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.verdict}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">{VERDICTS[d.verdict].label}</span>
            <span className="font-mono text-foreground">{d.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${d.pct}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- risk trend line ---------------------------- */

export function RiskTrendChart({
  data,
  height = 220,
}: {
  data: { t: string; risk: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={30} />
        <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="risk"
          name="Avg risk"
          stroke={CHART_COLORS.violet}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------ radial gauge ------------------------------ */

export function RadialGauge({
  value,
  label,
  color = CHART_COLORS.primary,
  height = 180,
}: {
  value: number;
  label: string;
  color?: string;
  height?: number;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ value }]}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} fill={color} background={{ fill: "var(--surface)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-subtle">{label}</span>
      </div>
    </div>
  );
}
