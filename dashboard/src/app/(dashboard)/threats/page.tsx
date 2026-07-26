"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { PageHeader, Panel, VerdictBadge, RiskMeter, EmptyState } from "@/components/dashboard/primitives";
import { EventDetail } from "@/components/dashboard/event-detail";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTelemetry } from "@/features/telemetry/store";
import { CATEGORIES, VERDICTS } from "@/lib/constants";
import type { GuardianEvent, ThreatCategory, Verdict } from "@/lib/types";
import { cn, createListKey } from "@/lib/utils";

export default function ThreatsPage() {
  return (
    <React.Suspense fallback={null}>
      <ThreatsInner />
    </React.Suspense>
  );
}

function ThreatsInner() {
  const params = useSearchParams();
  const events = useTelemetry((s) => s.events);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(params.get("category") ?? "all");
  const [verdict, setVerdict] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<GuardianEvent | null>(null);

  const threats = React.useMemo(
    () => events.filter((e) => e.category !== "benign"),
    [events],
  );

  const filtered = React.useMemo(() => {
    return threats.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (verdict !== "all" && e.verdict !== verdict) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !e.preview.toLowerCase().includes(q) &&
          !e.source.toLowerCase().includes(q) &&
          !e.target.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [threats, category, verdict, query]);

  return (
    <>
      <PageHeader
        title="Threat Detection"
        description="Every non-benign event, scored and categorized in real time."
        actions={
          <Badge variant="primary">
            <SlidersHorizontal className="size-3" />
            {filtered.length} matching
          </Badge>
        }
      />

      <Panel contentClassName="p-0">
        {/* toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search source, target, or content…"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(CATEGORIES) as ThreatCategory[])
                .filter((k) => k !== "benign")
                .map((k) => (
                  <SelectItem key={k} value={k}>
                    {CATEGORIES[k].label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={verdict} onValueChange={setVerdict}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Verdict" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verdicts</SelectItem>
              {(Object.keys(VERDICTS) as Verdict[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {VERDICTS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* table */}
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ShieldCheck}
              title="No matching threats"
              description="Either everything's clean, or your filters are too narrow. Try widening them."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-subtle">
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Source → Target</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Content</th>
                  <th className="px-5 py-3 font-medium">Verdict</th>
                  <th className="px-5 py-3 text-right font-medium">Risk</th>
                  <th className="hidden px-5 py-3 text-right font-medium sm:table-cell">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, index) => {
                  const cat = CATEGORIES[e.category];
                  return (
                    <tr
                      key={createListKey(e, index)}
                      onClick={() => setSelected(e)}
                      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-surface/40"
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="flex size-7 items-center justify-center rounded-lg"
                            style={{
                              background: `color-mix(in oklch, ${cat.hex} 14%, transparent)`,
                              color: cat.hex,
                            }}
                          >
                            <cat.icon className="size-3.5" />
                          </span>
                          <span className="font-medium text-foreground">{cat.short}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted">
                        <span className="text-foreground/80">{e.source}</span>
                        <span className="text-subtle"> → </span>
                        {e.tool ?? e.target}
                      </td>
                      <td className="hidden max-w-xs px-5 py-3 lg:table-cell">
                        <span className="line-clamp-1 font-mono text-xs text-subtle">
                          {e.preview}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <VerdictBadge verdict={e.verdict} />
                      </td>
                      <td className={cn("px-5 py-3 text-right font-mono font-medium")}>
                        <div className="flex justify-end">
                          <RiskMeter score={e.riskScore} size={34} />
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-right font-mono text-xs text-subtle sm:table-cell">
                        {format(new Date(e.timestamp), "HH:mm:ss")}
                      </td>
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
