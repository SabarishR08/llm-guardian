"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Filter } from "lucide-react";
import { PageHeader, Panel, VerdictBadge } from "@/components/dashboard/primitives";
import { EventDetail } from "@/components/dashboard/event-detail";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTelemetry } from "@/features/telemetry/store";
import { CATEGORIES, SEVERITY_META } from "@/lib/constants";
import type { GuardianEvent, Severity } from "@/lib/types";
import { createListKey } from "@/lib/utils";

export default function TimelinePage() {
  const events = useTelemetry((s) => s.events);
  const [minSeverity, setMinSeverity] = React.useState<string>("medium");
  const [selected, setSelected] = React.useState<GuardianEvent | null>(null);

  const filtered = React.useMemo(() => {
    const min = SEVERITY_META[(minSeverity as Severity) ?? "low"].rank;
    return events
      .filter((e) => e.category !== "benign" && SEVERITY_META[e.severity].rank >= min)
      .slice(0, 30);
  }, [events, minSeverity]);

  return (
    <>
      <PageHeader
        title="Attack Timeline"
        description="A chronological thread of every threat Guardian intercepted."
        actions={
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-subtle" />
            <Select value={minSeverity} onValueChange={setMinSeverity}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">All severities</SelectItem>
                <SelectItem value="medium">Medium and above</SelectItem>
                <SelectItem value="high">High and above</SelectItem>
                <SelectItem value="critical">Critical only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Panel contentClassName="p-6">
        <div className="relative">
          {/* vertical rail */}
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />

          <div className="space-y-1">
            {filtered.map((e, i) => {
              const cat = CATEGORIES[e.category];
              const sev = SEVERITY_META[e.severity];
              return (
                <motion.button
                  key={createListKey(e, i)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.4) }}
                  onClick={() => setSelected(e)}
                  className="group relative flex w-full items-start gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-surface/40"
                >
                  {/* node */}
                  <span className="relative z-10 mt-1 flex size-4 shrink-0 items-center justify-center">
                    <span
                      className="size-4 rounded-full border-2 border-background"
                      style={{ background: sev.hex }}
                    />
                    <span
                      className="absolute inset-0 animate-ping rounded-full opacity-40"
                      style={{ background: sev.hex, animationDuration: "2.5s" }}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <cat.icon className="size-4" style={{ color: cat.hex }} />
                      <span className="font-medium text-foreground">{cat.label}</span>
                      <VerdictBadge verdict={e.verdict} />
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.65rem] font-medium capitalize"
                        style={{
                          color: sev.hex,
                          background: `color-mix(in oklch, ${sev.hex} 12%, transparent)`,
                        }}
                      >
                        {e.severity}
                      </span>
                      <span className="ml-auto font-mono text-xs text-subtle">
                        {format(new Date(e.timestamp), "MMM d · HH:mm:ss")}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 font-mono text-xs text-muted">
                      {e.source} → {e.tool ?? e.target}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {e.explanation}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </Panel>

      <EventDetail event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
