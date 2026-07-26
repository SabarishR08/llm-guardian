"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Layers, Cpu, ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { CATEGORIES } from "@/lib/constants";
import type { ThreatCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const DETECTORS: {
  key: ThreatCategory;
  tier: string;
  engine: string;
}[] = [
  { key: "prompt_injection", tier: "Heuristic + Embeddings", engine: "MiniLM similarity" },
  { key: "tool_poisoning", tier: "Structural", engine: "Description diffing" },
  { key: "pii_leakage", tier: "ML → Regex", engine: "Presidio NER" },
  { key: "toxicity", tier: "ML → Lexicon", engine: "Detoxify" },
  { key: "encoded_payload", tier: "Heuristic", engine: "Entropy + decode" },
  { key: "schema_anomaly", tier: "Structural", engine: "JSON-schema drift" },
  { key: "policy_violation", tier: "Declarative", engine: "Rule engine" },
];

export function DetectionEngine() {
  const [active, setActive] = React.useState<ThreatCategory>("prompt_injection");

  React.useEffect(() => {
    const id = setInterval(() => {
      setActive((cur) => {
        const idx = DETECTORS.findIndex((d) => d.key === cur);
        return DETECTORS[(idx + 1) % DETECTORS.length].key;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="engine" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Detection engine"
          title="Seven detectors. One verdict."
          description="Detectors run concurrently and emit weighted signals. A risk aggregator fuses them into a single explainable decision - and each tier degrades gracefully when its model isn't available."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1px_0.9fr]">
          {/* Pipeline */}
          <div className="space-y-2">
            {DETECTORS.map((d, i) => {
              const c = CATEGORIES[d.key];
              const isActive = active === d.key;
              return (
                <Reveal key={d.key} delay={i * 0.04} direction="left">
                  <button
                    type="button"
                    onMouseEnter={() => setActive(d.key)}
                    onClick={() => setActive(d.key)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-300",
                      isActive
                        ? "border-primary/40 bg-primary/8 shadow-[0_0_30px_-12px_var(--primary)]"
                        : "border-border bg-card/40 hover:border-border-strong",
                    )}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: `color-mix(in oklch, ${c.hex} 14%, transparent)`,
                        color: c.hex,
                      }}
                    >
                      <c.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {c.label}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {d.engine}
                      </span>
                    </span>
                    <span className="hidden shrink-0 rounded-md border border-border bg-surface/60 px-2 py-1 font-mono text-[0.6rem] text-muted sm:block">
                      {d.tier}
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 transition-all",
                        isActive
                          ? "translate-x-0 text-primary-bright opacity-100"
                          : "-translate-x-1 opacity-0",
                      )}
                    />
                  </button>
                </Reveal>
              );
            })}
          </div>

          <div className="hidden bg-border lg:block" />

          {/* Aggregator */}
          <Reveal direction="right">
            <div className="sticky top-24 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers className="size-4 text-primary-bright" />
                Risk aggregator
              </div>

              <div className="mt-5 space-y-3">
                {DETECTORS.map((d) => {
                  const c = CATEGORIES[d.key];
                  const isActive = active === d.key;
                  const weight = isActive ? 92 : 8 + ((d.key.length * 7) % 22);
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs text-muted">
                        {c.short}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: c.hex }}
                          animate={{ width: `${weight}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4">
                <Cpu className="size-5 text-primary-bright" />
                <div className="text-xs leading-relaxed text-muted-foreground">
                  Weighted fusion → calibrated{" "}
                  <span className="font-medium text-foreground">risk score</span>,
                  category, explanation, and{" "}
                  <span className="font-medium text-foreground">verdict</span> -
                  typically under 30&nbsp;ms.
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
