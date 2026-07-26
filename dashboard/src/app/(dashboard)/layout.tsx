"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { TelemetryProvider } from "@/features/telemetry/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/store";
import { GuardianMark } from "@/components/brand/logo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const token = useAuth((s) => s.token);
  const [ready, setReady] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Auth guard - wait for the persisted store to rehydrate before deciding.
  React.useEffect(() => {
    const id = setTimeout(() => {
      if (!token) {
        router.replace("/login");
      } else {
        setReady(true);
      }
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
        <div className="flex h-dvh overflow-hidden bg-background">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Mobile drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOpen(false)}
                  className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
                />
                <motion.div
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: "spring", stiffness: 400, damping: 38 }}
                  className="fixed inset-y-0 left-0 z-50 lg:hidden"
                >
                  <Sidebar onNavigate={() => setMobileOpen(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onMenu={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </TelemetryProvider>
  );
}
