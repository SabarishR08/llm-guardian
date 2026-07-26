"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, Cpu, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import type { GuardianEvent } from "@/lib/types";
import { CATEGORIES, VERDICTS } from "@/lib/constants";
import { VerdictBadge, RiskMeter } from "./primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventDetail({
  event,
  onClose,
}: {
  event: GuardianEvent | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface/95 backdrop-blur-xl"
          >
            <Content event={event} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Content({
  event,
  onClose,
}: {
  event: GuardianEvent;
  onClose: () => void;
}) {
  const cat = CATEGORIES[event.category];
  const v = VERDICTS[event.verdict];

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-9 items-center justify-center rounded-lg"
            style={{
              background: `color-mix(in oklch, ${cat.hex} 14%, transparent)`,
              color: cat.hex,
            }}
          >
            <cat.icon className="size-4.5" />
          </span>
          <div>
            <div className="text-sm font-semibold">{cat.label}</div>
            <div className="font-mono text-[0.7rem] text-subtle">{event.id}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* verdict banner */}
        <div className={cn("flex items-center justify-between rounded-xl border p-4", v.bg, v.border)}>
          <div className="flex items-center gap-3">
            <RiskMeter score={event.riskScore} size={52} />
            <div>
              <VerdictBadge verdict={event.verdict} size="md" />
              <p className={cn("mt-1 text-xs", v.color)}>{event.severity} severity</p>
            </div>
          </div>
          {event.llmReasoned && (
            <span className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[0.65rem] text-primary-bright">
              <Cpu className="size-3" /> LLM
            </span>
          )}
        </div>

        {/* flow */}
        <Field label="Traffic flow">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2.5 font-mono text-xs">
            <span className="truncate text-foreground">{event.source}</span>
            <ArrowRight className="size-3.5 shrink-0 text-primary-bright" />
            <span className="truncate text-foreground">{event.target}</span>
          </div>
        </Field>

        {/* content preview */}
        <Field label="Inspected content">
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed text-foreground/90">
            {event.preview}
          </pre>
        </Field>

        {/* explanation */}
        <Field label="Explanation">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {event.explanation}
          </p>
        </Field>

        <Field label="Recommended action">
          <p className="text-sm text-foreground">{event.recommendedAction}</p>
        </Field>

        {/* signals */}
        {event.signals.length > 0 && (
          <Field label={`Detector signals (${event.signals.length})`}>
            <div className="space-y-2">
              {event.signals.map((s) => {
                const sc = CATEGORIES[s.category];
                return (
                  <div
                    key={s.detector}
                    className="rounded-lg border border-border bg-card/40 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <sc.icon className="size-3.5" style={{ color: sc.hex }} />
                      <span className="flex-1 text-xs font-medium text-foreground">
                        {s.detector}
                      </span>
                      <span className="font-mono text-xs" style={{ color: sc.hex }}>
                        {s.score}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                      {s.message}
                    </p>
                    {s.matched.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.matched.map((m, i) => (
                          <code
                            key={i}
                            className="rounded bg-block/10 px-1.5 py-0.5 font-mono text-[0.65rem] text-block"
                          >
                            {m}
                          </code>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(s.confidence * 100)}%`,
                          background: sc.hex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        )}

        {/* meta */}
        <div className="grid grid-cols-2 gap-2">
          <Meta icon={Clock} label="Timestamp" value={format(new Date(event.timestamp), "HH:mm:ss.SSS")} />
          <Meta icon={Zap} label="Latency" value={`${event.latencyMs} ms`} />
        </div>
      </div>

      <div className="flex gap-2 border-t border-border p-4">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Dismiss
        </Button>
        <Button variant="destructive" className="flex-1">
          Block source
        </Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
        {label}
      </div>
      {children}
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[0.65rem] text-subtle">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}
