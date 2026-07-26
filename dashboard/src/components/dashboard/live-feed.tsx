"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import type { GuardianEvent } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { VerdictBadge, RiskMeter } from "./primitives";
import { cn } from "@/lib/utils";

export function EventRow({
  event,
  onClick,
  compact = false,
}: {
  event: GuardianEvent;
  onClick?: () => void;
  compact?: boolean;
}) {
  const cat = CATEGORIES[event.category];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 text-left transition-colors hover:border-border hover:bg-surface/50",
        compact ? "py-2" : "py-2.5",
      )}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in oklch, ${cat.hex} 14%, transparent)`,
          color: cat.hex,
        }}
      >
        <cat.icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {cat.label}
          </span>
          <span
            className={cn(
              "hidden shrink-0 rounded px-1.5 py-0.5 font-mono text-[0.6rem] uppercase sm:inline",
              event.direction === "inbound"
                ? "bg-primary/10 text-primary-bright"
                : "bg-accent-violet/10 text-accent-violet",
            )}
          >
            {event.direction === "inbound" ? "in" : "out"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[0.7rem] text-subtle">
          <span className="truncate">{event.source}</span>
          <ArrowRight className="size-3 shrink-0" />
          <span className="truncate">{event.tool ?? event.target}</span>
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <span className="font-mono text-[0.7rem] text-subtle">
          {format(new Date(event.timestamp), "HH:mm:ss")}
        </span>
      </div>

      <VerdictBadge verdict={event.verdict} />
      <RiskMeter score={event.riskScore} size={compact ? 34 : 38} />
    </button>
  );
}

export function LiveFeed({
  events,
  onSelect,
  max = 40,
}: {
  events: GuardianEvent[];
  onSelect?: (e: GuardianEvent) => void;
  max?: number;
}) {
  const [paused, setPaused] = React.useState(false);
  const [frozen, setFrozen] = React.useState<GuardianEvent[]>([]);

  React.useEffect(() => {
    if (!paused) setFrozen(events.slice(0, max));
  }, [events, paused, max]);

  const shown = paused ? frozen : events.slice(0, max);

  const getEventKey = React.useCallback((event: GuardianEvent, index: number) => {
    const base = [
      event.id,
      event.timestamp,
      event.source,
      event.target,
      event.tool ?? event.target,
      event.category,
      event.verdict,
      event.riskScore,
    ]
      .filter(Boolean)
      .join("::");

    return `${base}::${index}`;
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            {!paused && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                paused ? "bg-subtle" : "bg-allow",
              )}
            />
          </span>
          <h3 className="text-sm font-semibold">Live event feed</h3>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {shown.map((event, index) => (
            <motion.div
              key={getEventKey(event, index)}
              layout
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <EventRow event={event} onClick={() => onSelect?.(event)} compact />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
