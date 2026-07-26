"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, ShieldQuestion } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VERDICTS, CATEGORIES } from "@/lib/constants";
import {
  analyze,
  DEMO_PRESETS,
  type LocalAnalysis,
} from "@/features/detection/local-analyzer";
import { cn } from "@/lib/utils";

export function InteractiveDemo() {
  const [value, setValue] = React.useState(DEMO_PRESETS[0].text);
  const [result, setResult] = React.useState<LocalAnalysis | null>(null);
  const [running, setRunning] = React.useState(false);

  const run = React.useCallback((text: string) => {
    setRunning(true);
    setResult(null);
    // brief theatrical delay so the scan reads as "work"
    window.setTimeout(() => {
      setResult(analyze(text));
      setRunning(false);
    }, 750);
  }, []);

  React.useEffect(() => {
    run(DEMO_PRESETS[0].text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="demo" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Interactive demo"
          title="Attack it yourself"
          description="Paste a payload or pick a preset. Guardian scores it against all seven detectors right here in your browser - the same engine that runs inline in production."
        />

        <Reveal className="mt-14">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Input */}
            <div className="rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                {DEMO_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setValue(p.text);
                      run(p.text);
                    }}
                    className="rounded-lg border border-border bg-surface/50 px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                spellCheck={false}
                rows={7}
                className="w-full resize-none rounded-xl border border-input bg-background/50 p-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                placeholder="Type or paste a message for Guardian to inspect…"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-xs text-subtle">
                  {value.length} chars
                </span>
                <Button onClick={() => run(value)} disabled={running}>
                  {running ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {running ? "Inspecting…" : "Inspect"}
                </Button>
              </div>
            </div>

            {/* Result */}
            <div className="min-h-[22rem] rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                {running ? (
                  <ScanningState key="scan" />
                ) : result ? (
                  <ResultState key="result" result={result} />
                ) : (
                  <EmptyState key="empty" />
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 text-center text-muted"
    >
      <ShieldQuestion className="size-8 text-subtle" />
      <p className="text-sm">Run an inspection to see the verdict.</p>
    </motion.div>
  );
}

function ScanningState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-4"
    >
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute size-16 animate-ping rounded-full bg-primary/20" />
        <span className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
      <p className="font-mono text-xs text-muted">
        Running 7 detectors concurrently…
      </p>
    </motion.div>
  );
}

function ResultState({ result }: { result: LocalAnalysis }) {
  const v = VERDICTS[result.verdict];
  const cat = CATEGORIES[result.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col"
    >
      {/* verdict header */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border p-4",
          v.bg,
          v.border,
        )}
      >
        <div className={cn("flex items-center gap-2.5", v.color)}>
          <v.icon className="size-5" />
          <div>
            <div className="text-sm font-semibold">{v.label}</div>
            <div className="text-[0.7rem] opacity-80">{cat.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("font-mono text-2xl font-semibold", v.color)}>
            {result.riskScore}
          </div>
          <div className="text-[0.65rem] text-subtle">risk / 100</div>
        </div>
      </div>

      {/* explanation */}
      <div className="mt-4">
        <div className="text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
          Explanation
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {result.explanation}
        </p>
      </div>

      <div className="mt-3">
        <div className="text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
          Recommended action
        </div>
        <p className="mt-1 text-sm text-foreground">{result.recommendedAction}</p>
      </div>

      {/* signals */}
      {result.signals.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
            Signals ({result.signals.length})
          </div>
          <div className="space-y-1.5">
            {result.signals.map((s, i) => {
              const c = CATEGORIES[s.category];
              return (
                <motion.div
                  key={s.detector}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2"
                >
                  <c.icon className="size-3.5 shrink-0" style={{ color: c.hex }} />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">
                    {s.detector}
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {s.score}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <Badge variant="outline">
          <span className="size-1.5 rounded-full bg-allow" />
          {result.latencyMs}ms
        </Badge>
        {result.redacted !== result.explanation &&
          result.signals.some((s) => s.category === "pii_leakage") && (
            <Badge variant="sanitize">PII redacted</Badge>
          )}
      </div>
    </motion.div>
  );
}
