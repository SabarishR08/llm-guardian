"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { NAV_SECTIONS } from "./nav-config";
import { useTelemetry } from "@/features/telemetry/store";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const threats = useTelemetry((s) => s.stats.threatsToday);
  const openIncidents = useTelemetry(
    (s) => s.incidents.filter((i) => i.status === "open").length,
  );

  const badgeFor = (key?: "threats" | "incidents") => {
    if (key === "threats") return threats > 0 ? threats : null;
    if (key === "incidents") return openIncidents > 0 ? openIncidents : null;
    return null;
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface/40 backdrop-blur-xl">
      <div className="flex h-16 items-center px-5">
        <Link href="/overview" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-subtle">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const badge = badgeFor(item.badgeKey);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted hover:bg-surface hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg border border-primary/25 bg-primary/10"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative size-4 shrink-0",
                        active && "text-primary-bright",
                      )}
                    />
                    <span className="relative flex-1">{item.label}</span>
                    {badge != null && (
                      <span
                        className={cn(
                          "relative flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold",
                          item.badgeKey === "threats"
                            ? "bg-block/15 text-block"
                            : "bg-quarantine/15 text-quarantine",
                        )}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <ConnectionCard />
    </aside>
  );
}

function ConnectionCard() {
  const connection = useTelemetry((s) => s.connection);
  const map = {
    live: { label: "Live · connected", color: "bg-allow", text: "text-allow" },
    demo: { label: "Live · simulator", color: "bg-primary", text: "text-primary-bright" },
    connecting: { label: "Connecting…", color: "bg-sanitize", text: "text-sanitize" },
    offline: { label: "Offline", color: "bg-block", text: "text-block" },
  }[connection];

  return (
    <div className="m-3 rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="relative flex size-2">
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", map.color)} />
          <span className={cn("relative inline-flex size-2 rounded-full", map.color)} />
        </span>
        <span className={cn("font-medium", map.text)}>{map.label}</span>
      </div>
      <p className="mt-1.5 text-[0.7rem] leading-relaxed text-subtle">
        Guardian is inspecting traffic in real time.
      </p>
    </div>
  );
}
