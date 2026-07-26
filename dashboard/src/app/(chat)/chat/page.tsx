"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, PanelRight, ShieldCheck } from "lucide-react";
import { useChat } from "@/features/chat/store";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { LiveRail } from "@/components/chat/live-rail";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { useTelemetry } from "@/features/telemetry/store";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const sending = useChat((s) => s.sending);
  const sendMessage = useChat((s) => s.sendMessage);
  const abort = useChat((s) => s.abort);
  const connection = useTelemetry((s) => s.connection);

  const [mobileNav, setMobileNav] = React.useState(false);
  const [railOpen, setRailOpen] = React.useState(true);

  const convo = conversations.find((c) => c.id === activeId) ?? null;
  const messages = convo?.messages ?? [];

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content ?? "";
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastContent]);

  function handlePrompt(prompt: string) {
    if (sending) return;
    void sendMessage(prompt);
  }

  return (
    <div className="flex h-dvh">
      {/* Left sidebar - desktop */}
      <div className="hidden lg:block">
        <ChatSidebar />
      </div>

      {/* Left sidebar - mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <ChatSidebar onNavigate={() => setMobileNav(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <button
            onClick={() => setMobileNav(true)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-primary-bright" />
            <h1 className="truncate text-sm font-medium text-foreground">
              {convo?.title ?? "New conversation"}
            </h1>
          </div>
          <span className="hidden items-center gap-1.5 text-[0.7rem] text-subtle sm:flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                connection === "live" ? "bg-allow" : "bg-sanitize",
              )}
            />
            {connection === "live" ? "Backend live" : "Demo mode"}
          </span>
          <button
            onClick={() => setRailOpen((v) => !v)}
            className={cn(
              "rounded-lg p-1.5 transition-colors hover:bg-surface",
              railOpen ? "text-primary-bright" : "text-muted hover:text-foreground",
            )}
            aria-label="Toggle live panel"
          >
            <PanelRight className="size-4.5" />
          </button>
        </header>

        <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col">
            <MessageList messages={messages} onPickPrompt={handlePrompt} />
          </div>
        </div>

        <Composer onSend={sendMessage} onStop={abort} sending={sending} />
      </div>

      {/* Right rail - desktop, collapsible */}
      <AnimatePresence initial={false}>
        {railOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="hidden overflow-hidden xl:block"
          >
            <LiveRail onCollapse={() => setRailOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
