"use client";

import { motion } from "framer-motion";
import {
  Radar,
  GitBranch,
  Gauge,
  Brain,
   Lock as LockIcon,
  Workflow,
  Boxes,
  Clock,
} from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

function Tile({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "border-gradient group relative overflow-hidden rounded-2xl bg-card/50 p-6 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function IconBadge({ icon: Icon }: { icon: typeof Radar }) {
  return (
    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary-bright ring-1 ring-primary/20">
      <Icon className="size-5" />
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Platform"
          title="A complete security operations center for AI"
          description="Everything a SOC team expects - real-time telemetry, forensic timelines, and explainable verdicts - purpose-built for agentic traffic."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Large: real-time monitoring */}
          <Reveal className="md:col-span-2">
            <Tile className="h-full">
              <IconBadge icon={Radar} />
              <h3 className="mt-4 text-lg font-semibold">
                Real-time bidirectional monitoring
              </h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                A live WebSocket feed streams every inspected message the instant
                it crosses the wire - with verdict, risk score, and latency.
              </p>
              <LiveFeedPreview />
            </Tile>
          </Reveal>

          {/* Risk scoring */}
          <Reveal delay={0.06}>
            <Tile className="h-full">
              <IconBadge icon={Gauge} />
              <h3 className="mt-4 text-lg font-semibold">0–100 risk scoring</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Every message gets a calibrated score and a verdict band.
              </p>
              <ScoreBands />
            </Tile>
          </Reveal>

          {/* Attack graph */}
          <Reveal delay={0.04}>
            <Tile className="h-full">
              <IconBadge icon={GitBranch} />
              <h3 className="mt-4 text-lg font-semibold">
                Attack propagation graph
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Trace how a single injection spreads across agents and tools.
              </p>
              <MiniGraph />
            </Tile>
          </Reveal>

          {/* Explainability */}
          <Reveal delay={0.08} className="md:col-span-2">
            <Tile className="h-full">
              <div className="flex items-start gap-4">
                <IconBadge icon={Brain} />
                <div>
                  <h3 className="text-lg font-semibold">
                    Explainable, LLM-reasoned verdicts
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Guardian doesn&apos;t just flag - it explains why, cites the
                    evidence, and recommends an action. Backed by Groq for speed,
                    with a deterministic fallback that keeps working offline.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {["Evidence", "Reasoning", "Recommendation", "Confidence"].map(
                      (t) => (
                        <span
                          key={t}
                          className="rounded-lg border border-border bg-surface/50 px-2.5 py-1.5 text-center text-muted"
                        >
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </Tile>
          </Reveal>

          {/* Small trio */}
          {[
            {
              icon: LockIcon,
              title: "PII redaction",
              body: "Presidio-grade detection with a regex fallback.",
            },
            {
              icon: Workflow,
              title: "Policy engine",
              body: "Declarative rules with per-tool overrides.",
            },
            {
              icon: Boxes,
              title: "Runs offline",
              body: "Zero mandatory cloud calls. Air-gap friendly.",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={0.05 * i}>
              <Tile className="h-full">
                <IconBadge icon={f.icon} />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </Tile>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveFeedPreview() {
  const rows = [
    { t: "prompt_injection", v: "BLOCK", s: 96, c: "text-block" },
    { t: "pii_leakage", v: "SANITIZE", s: 44, c: "text-sanitize" },
    { t: "benign", v: "ALLOW", s: 4, c: "text-allow" },
  ];
  return (
    <div className="mt-6 space-y-1.5">
      {rows.map((r, i) => (
        <motion.div
          key={r.t}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 * i, duration: 0.5 }}
          className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 font-mono text-[0.72rem]"
        >
          <span className="flex items-center gap-2 text-muted">
            <Clock className="size-3 text-subtle" />
            {r.t}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-subtle">{r.s}</span>
            <span className={cn("font-semibold", r.c)}>{r.v}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ScoreBands() {
  const bands = [
    { label: "Allow", w: "24%", c: "var(--allow)" },
    { label: "Sanitize", w: "25%", c: "var(--sanitize)" },
    { label: "Quarantine", w: "25%", c: "var(--quarantine)" },
    { label: "Block", w: "26%", c: "var(--block)" },
  ];
  return (
    <div className="mt-6">
      <div className="flex h-2 overflow-hidden rounded-full">
        {bands.map((b) => (
          <div
            key={b.label}
            style={{ width: b.w, background: b.c }}
            className="opacity-80"
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[0.6rem] text-subtle">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

function MiniGraph() {
  return (
    <svg viewBox="0 0 220 90" className="mt-6 w-full">
      <defs>
        <linearGradient id="mg-line" x1="0" x2="1">
          <stop offset="0" stopColor="var(--block)" />
          <stop offset="1" stopColor="var(--quarantine)" />
        </linearGradient>
      </defs>
      {[
        [30, 45, 100, 25],
        [100, 25, 170, 45],
        [100, 25, 100, 70],
        [100, 70, 190, 70],
      ].map(([x1, y1, x2, y2], i) => (
        <motion.line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="url(#mg-line)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 * i, duration: 0.7 }}
        />
      ))}
      {[
        [30, 45, "var(--block)"],
        [100, 25, "var(--quarantine)"],
        [170, 45, "var(--sanitize)"],
        [100, 70, "var(--primary)"],
        [190, 70, "var(--muted)"],
      ].map(([cx, cy, fill], i) => (
        <motion.circle
          key={i}
          cx={cx as number}
          cy={cy as number}
          r="5"
          fill={fill as string}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 * i, type: "spring", stiffness: 260 }}
        />
      ))}
    </svg>
  );
}
