"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ALL_NAV_ITEMS } from "./nav-config";
import { CATEGORIES } from "@/lib/constants";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const commands = React.useMemo<Command[]>(() => {
    const nav = ALL_NAV_ITEMS.map((item) => ({
      id: item.href,
      label: item.label,
      hint: "Navigate",
      icon: <item.icon className="size-4" />,
      action: () => router.push(item.href),
    }));
    const filters = (Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[])
      .filter((k) => k !== "benign")
      .map((k) => {
        const c = CATEGORIES[k];
        return {
          id: `filter-${k}`,
          label: `Filter: ${c.label}`,
          hint: "Threats",
          icon: <c.icon className="size-4" />,
          action: () => router.push(`/threats?category=${k}`),
        };
      });
    return [...nav, ...filters];
  }, [router]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  React.useEffect(() => setActive(0), [query]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const run = (cmd: Command) => {
    cmd.action();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="size-4 text-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                run(filtered[active]);
              }
            }}
            placeholder="Search pages, filters, actions…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle"
          />
          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.65rem] text-subtle">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-subtle">
              No results for “{query}”
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-surface text-foreground" : "text-muted",
                )}
              >
                <span className="text-subtle">{cmd.icon}</span>
                <span className="flex-1">{cmd.label}</span>
                <span className="text-[0.7rem] text-subtle">{cmd.hint}</span>
                {i === active && (
                  <CornerDownLeft className="size-3.5 text-subtle" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
