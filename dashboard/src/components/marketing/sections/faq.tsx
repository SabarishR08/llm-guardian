"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How does Guardian sit inline without breaking my agents?",
    a: "Guardian is a transparent bidirectional proxy that speaks the Model Context Protocol. You point your agent or MCP client at Guardian's endpoint instead of the tool server directly - no SDK changes, no code rewrites. It inspects both the request and the response on the same hop.",
  },
  {
    q: "What happens when a threat is detected?",
    a: "Every message receives a 0–100 risk score and one of four verdicts: ALLOW forwards it untouched, SANITIZE strips the unsafe fragments (e.g. redacts PII), QUARANTINE holds it for human review, and BLOCK drops it and flags the actor. Thresholds are fully configurable per policy.",
  },
  {
    q: "Does it require sending my data to a cloud LLM?",
    a: "No. The seven-detector heuristic and ML tiers run entirely on your infrastructure. Guardian can optionally call Groq for faster natural-language explanations, and falls back to a local Ollama model or a deterministic explainer - so it works fully air-gapped.",
  },
  {
    q: "What's the performance overhead?",
    a: "Detectors run concurrently and the aggregator fuses their signals in a single pass. Typical end-to-end inline latency is under 30 ms for heuristic decisions; ML-heavy inspections are cached and batched.",
  },
  {
    q: "Which threats does it actually catch?",
    a: "Prompt injection, tool poisoning, PII leakage, toxicity, policy violations, encoded/obfuscated payloads, and schema anomalies - in both directions. New detectors plug into the same pipeline without touching the core.",
  },
  {
    q: "Can I see what it blocked and why?",
    a: "Yes. The dashboard streams a live event feed, an attack timeline, and an attack-propagation graph, and every verdict ships with cited evidence, an explanation, and a recommended action. Reports export to PDF/CSV for compliance.",
  },
];

export function FAQ() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything you need to know about running Guardian in production."
        />

        <div className="mt-14 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={cn(
                        "text-[0.95rem] font-medium transition-colors",
                        isOpen ? "text-foreground" : "text-muted",
                      )}
                    >
                      {f.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                        isOpen
                          ? "border-primary/30 bg-primary/10 text-primary-bright"
                          : "border-border text-muted",
                      )}
                    >
                      <Plus className="size-4" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
