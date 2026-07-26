"use client";

import { motion } from "framer-motion";
import {
  Users,
  Bot,
  Server,
  ShieldCheck,
  ArrowLeftRight,
  ScanLine,
  Gavel,
} from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { GuardianMark } from "@/components/brand/logo";

const STEPS = [
  {
    icon: ArrowLeftRight,
    title: "Intercept",
    body: "Every request and every tool response is transparently proxied - both directions, no code changes.",
  },
  {
    icon: ScanLine,
    title: "Inspect",
    body: "Seven detectors run concurrently: injection, poisoning, PII, toxicity, policy, encoding, and schema.",
  },
  {
    icon: Gavel,
    title: "Decide",
    body: "Signals are fused into a 0–100 risk score, an explanation, and a verdict - in a single hop.",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-dots opacity-[0.4] mask-fade-radial" />
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Architecture"
          title="One hop. Both directions. Nothing gets past."
          description="Guardian is a bidirectional proxy that sits on the wire between users, agents, and MCP tool servers. If it isn't inspected, it isn't delivered."
        />

        <Reveal className="mt-16">
          <TopologyDiagram />
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary-bright">
                  <s.icon className="size-5" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-subtle">
                    0{i + 1}
                  </span>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Node({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: typeof Users;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-surface/70 text-foreground shadow-sm backdrop-blur">
        <Icon className="size-6" />
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-[0.7rem] text-subtle">{sublabel}</div>
      </div>
    </div>
  );
}

function Wire({ reverse }: { reverse?: boolean }) {
  return (
    <div className="relative hidden h-px min-w-[3rem] flex-1 bg-border sm:block">
      <motion.span
        className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_2px_var(--primary)]"
        animate={{ left: reverse ? ["100%", "0%"] : ["0%", "100%"] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.4,
        }}
      />
    </div>
  );
}

function TopologyDiagram() {
  return (
    <div className="border-gradient relative overflow-hidden rounded-3xl bg-card/40 p-8 backdrop-blur-sm sm:p-12">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between sm:gap-0">
        <Node icon={Users} label="Users" sublabel="prompts" />
        <Wire />
        <Node icon={Bot} label="AI Agents" sublabel="reasoning" />
        <Wire />

        {/* Guardian core */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="glow-primary relative flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/8 px-6 py-4 backdrop-blur"
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl">
            <div
              className="animate-scan absolute inset-x-0 h-12 opacity-60"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, color-mix(in oklch, var(--primary) 30%, transparent), transparent)",
              }}
            />
          </div>
          <GuardianMark className="size-9" animated />
          <div className="text-center">
            <div className="text-sm font-semibold text-foreground">
              Guardian
            </div>
            <div className="text-[0.7rem] text-primary-bright">
              inline firewall
            </div>
          </div>
        </motion.div>

        <Wire reverse />
        <Node icon={Server} label="MCP Tools" sublabel="servers" />
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-xs text-muted">
        <ShieldCheck className="size-3.5 text-allow" />
        Full-duplex inspection · fail-closed on threat · zero trust between hops
      </div>
    </div>
  );
}
