"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, MessageSquare, Trash2, LayoutDashboard, X } from "lucide-react";
import { useChat } from "@/features/chat/store";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const newConversation = useChat((s) => s.newConversation);
  const selectConversation = useChat((s) => s.selectConversation);
  const deleteConversation = useChat((s) => s.deleteConversation);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <div className="flex h-full w-[280px] flex-col border-r border-border bg-surface/30">
      <div className="flex items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        {onNavigate && (
          <button onClick={onNavigate} className="rounded-lg p-1.5 text-muted hover:bg-surface lg:hidden">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="px-3">
        <button
          onClick={() => {
            newConversation();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-card"
        >
          <Plus className="size-4 text-primary-bright" />
          New chat
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5">
          <Search className="size-3.5 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-subtle">
            {query ? "No matching chats." : "No conversations yet."}
          </p>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence initial={false}>
              {filtered.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="group relative"
                >
                  <button
                    onClick={() => {
                      selectConversation(c.id);
                      onNavigate?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      c.id === activeId ? "bg-card text-foreground" : "text-muted hover:bg-surface/60 hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0 text-subtle" />
                    <span className="flex-1 truncate">{c.title}</span>
                  </button>
                  <button
                    onClick={() => deleteConversation(c.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle opacity-0 transition-opacity hover:bg-surface hover:text-block group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <Link
          href="/overview"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface/60 hover:text-foreground"
        >
          <LayoutDashboard className="size-4" />
          Security dashboard
          <span className="ml-auto rounded bg-surface px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-subtle">
            SOC
          </span>
        </Link>
      </div>
    </div>
  );
}
