"use client";

import { motion } from "framer-motion";
import { MonitorSmartphone, Server, Container } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";

const GROUPS = [
  {
    icon: MonitorSmartphone,
    label: "Frontend",
    items: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind CSS v4",
      "Framer Motion",
      "React Flow",
      "Recharts",
      "Radix UI",
    ],
  },
  {
    icon: Server,
    label: "Backend",
    items: [
      "FastAPI",
      "Python 3.13",
      "WebSockets",
      "Redis",
      "JWT",
      "Sentence-Transformers",
      "Presidio",
      "Detoxify",
      "Groq",
      "Ollama",
    ],
  },
  {
    icon: Container,
    label: "Deployment",
    items: ["Docker", "Docker Compose", "GitHub Actions"],
  },
];

export function Technology() {
  return (
    <section id="technology" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Technology"
          title="Built on a production-grade stack"
          description="Modern, typed, and observable end to end - the same tools you'd ship a Series-A product on."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {GROUPS.map((g, gi) => (
            <Reveal key={g.label} delay={gi * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary-bright">
                    <g.icon className="size-4.5" />
                  </span>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    {g.label}
                  </h3>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {g.items.map((item, i) => (
                    <motion.span
                      key={item}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.03 * i, duration: 0.35 }}
                      className="rounded-lg border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      {item}
                    </motion.span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
