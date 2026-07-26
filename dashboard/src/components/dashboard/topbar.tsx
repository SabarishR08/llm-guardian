"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { ALL_NAV_ITEMS } from "./nav-config";
import { useAuth } from "@/features/auth/store";
import { useTelemetry } from "@/features/telemetry/store";
import { formatNumber } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const inspected = useTelemetry((s) => s.stats.inspected);

  const current = ALL_NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")
    : "GA";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="flex size-9 items-center justify-center rounded-lg border border-border text-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>

      <div className="hidden sm:block">
        <div className="flex items-center gap-2">
          {current?.icon && <current.icon className="size-4 text-primary-bright" />}
          <h1 className="text-sm font-semibold text-foreground">
            {current?.label ?? "Dashboard"}
          </h1>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 text-sm text-subtle transition-colors hover:border-border-strong sm:w-64"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.65rem] sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-2.5 py-1.5 text-xs text-muted md:flex">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-allow" />
          </span>
          <span className="font-mono">{formatNumber(inspected)}</span>
          <span className="text-subtle">inspected</span>
        </div>

        <NotificationsMenu />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-9 border border-border">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {user?.name ?? "Guardian Admin"}
                </span>
                <span className="text-xs text-subtle">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <SettingsIcon /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="text-block focus:bg-block/10"
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}

function NotificationsMenu() {
  const allIncidents = useTelemetry((s) => s.incidents);
  const incidents = allIncidents.slice(0, 5);
  const open = allIncidents.filter((i) => i.status === "open").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {open > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-block text-[0.6rem] font-semibold text-white"
            >
              {open > 9 ? "9+" : open}
            </motion.span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Recent incidents</span>
          <span className="text-block">{open} open</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {incidents.map((inc) => (
          <DropdownMenuItem key={inc.id} className="flex-col items-start gap-0.5 py-2.5">
            <div className="flex w-full items-center gap-2">
              <ShieldAlert className="size-3.5 text-block" />
              <span className="flex-1 truncate text-xs font-medium text-foreground">
                {inc.title}
              </span>
            </div>
            <span className="pl-5 text-[0.7rem] text-subtle">
              {formatDistanceToNow(new Date(inc.timestamp), { addSuffix: true })}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
