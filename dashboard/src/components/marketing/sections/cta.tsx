"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/visuals/aurora";
import { Reveal } from "@/components/motion/reveal";
import { GuardianMark } from "@/components/brand/logo";

export function CTA() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="border-gradient glow-soft relative overflow-hidden rounded-3xl bg-card/50 px-6 py-16 text-center backdrop-blur-sm sm:px-16">
            <Aurora intensity="subtle" className="mask-fade-radial" />
            <div className="relative">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                <GuardianMark className="size-8" animated />
              </div>
              <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Put a firewall between your agents and the world.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Spin up the dashboard, connect a tool server, and watch Guardian
                score live traffic in seconds.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="glow-soft">
                  <Link href="/chat">
                    Try the live assistant
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/register">Create an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
