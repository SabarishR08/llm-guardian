"use client";

import * as React from "react";
import { format } from "date-fns";
import { Search, Download, ScrollText } from "lucide-react";
import { PageHeader, Panel, VerdictBadge, EmptyState } from "@/components/dashboard/primitives";
import { EventDetail } from "@/components/dashboard/event-detail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTelemetry } from "@/features/telemetry/store";
import { CATEGORIES } from "@/lib/constants";
import { exportEventsCSV } from "@/lib/export";
import { cn, createListKey } from "@/lib/utils";
import type { GuardianEvent } from "@/lib/types";
import { toast } from "sonner";

export default function LogsPage() {
  const events = useTelemetry((s) => s.events);
  const [query, setQuery] = React.useState("");
  const [direction, setDirection] = React.useState("all");
  const [verdict, setVerdict] = React.useState("all");
  const [selected, setSelected] = React.useState<GuardianEvent | null>(null);

  const filtered = React.useMemo(() => {
    return events.filter((e) => {
      if (direction !== "all" && e.direction !== direction) return false;
      if (verdict !== "all" && e.verdict !== verdict) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          e.preview.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          (e.tool ?? e.target).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, query, direction, verdict]);

  const onExport = () => {
    exportEventsCSV(filtered);
    toast.success("Log export ready", {
      description: `${filtered.length} events written to CSV.`,
    });
  };

  return (
    <>
      <PageHeader
        title="Logs"
        description="The full audit trail of every message Guardian inspected."
        actions={
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        }
      />

      <Panel contentClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by id, source, tool, or content…"
              className="pl-9 font-mono text-xs"
            />
          </div>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verdict} onValueChange={setVerdict}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Verdict" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verdicts</SelectItem>
              <SelectItem value="ALLOW">Allow</SelectItem>
              <SelectItem value="SANITIZE">Sanitize</SelectItem>
              <SelectItem value="QUARANTINE">Quarantine</SelectItem>
              <SelectItem value="BLOCK">Block</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ScrollText} title="No log entries" description="No events match your filters yet." />
          </div>
        ) : (
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                <tr className="border-b border-border text-left text-subtle">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Dir</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Source → Target</th>
                  <th className="px-4 py-2.5 font-medium">Verdict</th>
                  <th className="px-4 py-2.5 text-right font-medium">Risk</th>
                  <th className="px-4 py-2.5 text-right font-medium">Latency</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filtered.map((e, index) => {
                  const cat = CATEGORIES[e.category];
                  return (
                    <tr
                      key={createListKey(e, index)}
                      onClick={() => setSelected(e)}
                      className="cursor-pointer border-b border-border/40 transition-colors hover:bg-surface/40"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-subtle">
                        {format(new Date(e.timestamp), "HH:mm:ss.SSS")}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[0.6rem] uppercase",
                            e.direction === "inbound"
                              ? "bg-primary/10 text-primary-bright"
                              : "bg-accent-violet/10 text-accent-violet",
                          )}
                        >
                          {e.direction === "inbound" ? "in" : "out"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1.5" style={{ color: cat.hex }}>
                          <cat.icon className="size-3.5" />
                          <span className="font-sans text-foreground">{cat.short}</span>
                        </span>
                      </td>
                      <td className="hidden max-w-xs truncate px-4 py-2 text-muted md:table-cell">
                        {e.source} → {e.tool ?? e.target}
                      </td>
                      <td className="px-4 py-2">
                        <VerdictBadge verdict={e.verdict} />
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">{e.riskScore}</td>
                      <td className="px-4 py-2 text-right text-subtle">{e.latencyMs}ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <EventDetail event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
