"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { TelemetryProvider } from "@/features/telemetry/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/store";
import { GuardianMark } from "@/components/brand/logo";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => {
      if (!token) router.replace("/login");
      else setReady(true);
    }, 60);
    return () => clearTimeout(id);
  }, [token, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <GuardianMark className="size-10 animate-pulse-glow" />
          <span className="text-sm text-muted">Securing session…</span>
        </div>
      </div>
    );
  }

  return (
    <TelemetryProvider>
      <TooltipProvider delayDuration={200}>
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-dvh overflow-hidden bg-background"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </TooltipProvider>
    </TelemetryProvider>
  );
}
