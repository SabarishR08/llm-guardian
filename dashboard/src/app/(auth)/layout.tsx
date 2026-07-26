import Link from "next/link";
import { ShieldCheck, Activity, Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Aurora } from "@/components/visuals/aurora";
import { Particles } from "@/components/visuals/particles";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="relative flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="absolute left-6 top-6 sm:left-12 lg:left-16">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>

      {/* Brand showcase side */}
      <div className="relative hidden overflow-hidden border-l border-border lg:block">
        <Aurora intensity="vivid" />
        <Particles className="opacity-60" quantity={40} />
        <div className="absolute inset-0 bg-grid mask-fade-radial opacity-40" />

        <div className="relative flex h-full flex-col justify-between p-14">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-allow" />
            </span>
            Guardian control plane
          </div>

          <div className="max-w-md">
            <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
              Every request. Every response.{" "}
              <span className="text-gradient-brand">Inspected.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Sign in to the operations console - live threat telemetry, verdict
              controls, and forensic timelines for your AI agents.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: Activity, label: "Real-time bidirectional monitoring" },
                { icon: ShieldCheck, label: "Seven concurrent detection engines" },
                { icon: Lock, label: "Runs fully on your infrastructure" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 backdrop-blur-sm"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary-bright">
                    <f.icon className="size-4" />
                  </span>
                  <span className="text-sm text-foreground/90">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs text-subtle">
            <span>SOC 2 aligned</span>
            <span>·</span>
            <span>Zero data retention</span>
            <span>·</span>
            <span>Air-gap ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
