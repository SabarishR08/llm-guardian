"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { CATEGORIES } from "@/lib/constants";
import type { ThreatCategory } from "@/lib/types";

const THREATS: { key: ThreatCategory; stat: string; note: string }[] = [
  { key: "prompt_injection", stat: "#1", note: "OWASP LLM risk" },
  { key: "tool_poisoning", stat: "Silent", note: "Metadata-borne" },
  { key: "pii_leakage", stat: "Outbound", note: "Data exfiltration" },
  { key: "encoded_payload", stat: "Obfuscated", note: "Bypasses filters" },
  { key: "toxicity", stat: "Bidirectional", note: "In & out" },
  { key: "schema_anomaly", stat: "Drift", note: "Contract breaks" },
];

export function Problem() {
  return (
    <section id="problem" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="The problem"
          title={
            <>
              AI agents trust everything.
              <br />
              <span className="text-muted">That&apos;s the attack surface.</span>
            </>
          }
          description="The moment an agent can call tools, every message becomes executable. A single poisoned tool description or a cleverly worded prompt can turn your assistant into an insider threat - and traditional WAFs never see it."
        />

        <Stagger className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THREATS.map(({ key, stat, note }) => {
            const c = CATEGORIES[key];
            return (
              <StaggerItem key={key}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="border-gradient group h-full rounded-2xl bg-card/50 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex size-11 items-center justify-center rounded-xl border border-border"
                      style={{
                        background: `color-mix(in oklch, ${c.hex} 12%, transparent)`,
                      }}
                    >
                      <c.icon
                        className="size-5"
                        style={{ color: c.hex }}
                      />
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold text-foreground">
                        {stat}
                      </span>
                      <span className="block text-[0.7rem] text-subtle">
                        {note}
                      </span>
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-foreground">
                    {c.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {c.description}
                  </p>
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal className="mt-12" delay={0.1}>
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-xl border border-block/20 bg-block/8 px-5 py-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-block" />
            <span className="text-muted-foreground">
              Your firewall inspects packets. Guardian inspects{" "}
              <span className="font-medium text-foreground">intent</span>.
            </span>
            <ArrowRight className="ml-auto size-4 shrink-0 text-muted" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
