"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { VERDICTS } from "@/lib/constants";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

/* --------------------------------- header -------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/* -------------------------------- stat card ------------------------------- */

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  accent = "primary",
  spark,
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: { value: number; positiveIsGood?: boolean };
  accent?: "primary" | "allow" | "sanitize" | "quarantine" | "block";
  spark?: number[];
  index?: number;
}) {
  const accentVar = {
    primary: "var(--primary)",
    allow: "var(--allow)",
    sanitize: "var(--sanitize)",
    quarantine: "var(--quarantine)",
    block: "var(--block)",
  }[accent];

  const up = (delta?.value ?? 0) >= 0;
  const good = delta?.positiveIsGood === false ? !up : up;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="border-gradient group relative overflow-hidden rounded-2xl bg-card/50 p-5 backdrop-blur-sm"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: accentVar }}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span
          className="flex size-9 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklch, ${accentVar} 14%, transparent)`,
            color: accentVar,
          }}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {spark && spark.length > 1 && <Sparkline data={spark} color={accentVar} />}
      </div>
      {delta && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium",
              good ? "text-allow" : "text-block",
            )}
          >
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Math.abs(delta.value)}%
          </span>
          <span className="text-subtle">vs. yesterday</span>
        </div>
      )}
    </motion.div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 72;
  const h = 30;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

/* ------------------------------ verdict badge ----------------------------- */

export function VerdictBadge({
  verdict,
  size = "sm",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  const v = VERDICTS[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        v.bg,
        v.border,
        v.color,
        size === "sm" ? "px-2 py-0.5 text-[0.7rem]" : "px-2.5 py-1 text-xs",
      )}
    >
      <v.icon className={size === "sm" ? "size-3" : "size-3.5"} />
      {v.label}
    </span>
  );
}

/* ------------------------------- risk meter ------------------------------- */

export function RiskMeter({
  score,
  size = 44,
  showLabel = true,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const color =
    score >= 75
      ? "var(--block)"
      : score >= 50
        ? "var(--quarantine)"
        : score >= 25
          ? "var(--sanitize)"
          : "var(--allow)";
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute font-mono font-semibold tabular-nums"
          style={{ fontSize: size * 0.28, color }}
        >
          {score}
        </span>
      )}
    </div>
  );
}

/* ------------------------------- empty state ------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-card/30 px-6 py-16 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border bg-surface/60">
          <Icon className="size-6 text-muted" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------ section card ------------------------------ */

export function Panel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card/50 backdrop-blur-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </div>
  );
}
