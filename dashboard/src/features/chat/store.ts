"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { streamChatTurn, type ChatStreamEvent } from "./stream-client";
import type {
  ChatMessage,
  Conversation,
  PipelineStep,
  ToolName,
  Attachment,
  GuardianVerdictPayload,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------------------------------------------------------------- */
/*  Session activity - derived ONLY from real conversation turns.    */
/*  This is what the chat's live rail reflects, so its numbers and    */
/*  threat feed come from the judge's actual requests, never from the */
/*  backend traffic simulator (which still feeds the SOC dashboard).  */
/* ---------------------------------------------------------------- */

export interface SessionThreat {
  id: string;
  category: GuardianVerdictPayload["category"];
  verdict: GuardianVerdictPayload["verdict"];
  riskScore: number;
  source: string;
  at: string;
}

export interface SessionActivity {
  inspected: number;
  threats: number;
  avgLatencyMs: number;
  threatEvents: SessionThreat[];
}

const TOOL_SOURCE_LABEL: Record<string, string> = {
  read_document: "tool:read_document",
  list_documents: "tool:list_documents",
  web_search: "tool:web_search",
  send_notification: "tool:send_notification",
};

export function selectSessionActivity(conversations: Conversation[]): SessionActivity {
  let inspected = 0;
  let latencySum = 0;
  const threats: SessionThreat[] = [];

  for (const convo of conversations) {
    for (const msg of convo.messages) {
      if (msg.role !== "assistant" || !msg.steps) continue;

      const toolStep = msg.steps.find((s) => s.kind === "tool_call") as
        | Extract<PipelineStep, { kind: "tool_call" }>
        | undefined;

      for (const step of msg.steps) {
        if (step.kind !== "inbound_scan" && step.kind !== "guardian_scan") continue;
        const result = step.result;
        if (!result) continue;

        inspected += 1;
        latencySum += result.latencyMs ?? 0;

        if (result.category !== "benign") {
          threats.push({
            id: `${msg.id}-${step.kind}`,
            category: result.category,
            verdict: result.verdict,
            riskScore: result.riskScore,
            source: step.kind === "inbound_scan" ? "your prompt" : TOOL_SOURCE_LABEL[toolStep?.tool ?? ""] ?? "tool",
            at: msg.createdAt,
          });
        }
      }
    }
  }

  return {
    inspected,
    threats: threats.length,
    avgLatencyMs: inspected ? Math.round((latencySum / inspected) * 10) / 10 : 0,
    threatEvents: threats.reverse(),
  };
}

function titleFromMessage(text: string, attachmentName?: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean && attachmentName) return attachmentName;
  return clean.length > 48 ? clean.slice(0, 48) + "…" : clean || "New conversation";
}

function verdictPayload(raw: Record<string, unknown>): GuardianVerdictPayload {
  return {
    riskScore: raw.riskScore as number,
    category: raw.category as GuardianVerdictPayload["category"],
    verdict: raw.verdict as GuardianVerdictPayload["verdict"],
    severity: raw.severity as GuardianVerdictPayload["severity"],
    explanation: raw.explanation as string,
    recommendedAction: raw.recommendedAction as string,
    signals: (raw.signals as GuardianVerdictPayload["signals"]) ?? [],
    latencyMs: (raw.latencyMs as number) ?? 0,
    evidence: (raw.evidence as GuardianVerdictPayload["evidence"]) ?? [],
    sanitizedPreview: (raw.sanitizedPreview as string | null) ?? null,
  };
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  sending: boolean;
  streamStatus: "idle" | "connecting" | "live" | "error";

  activeConversation: () => Conversation | null;
  newConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;

  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  abort: () => void;
}

let activeAbort: AbortController | null = null;

export const useChat = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      sending: false,
      streamStatus: "idle",

      activeConversation: () => {
        const { conversations, activeId } = get();
        return conversations.find((c) => c.id === activeId) ?? null;
      },

      newConversation: () => {
        const id = uid();
        const now = new Date().toISOString();
        const convo: Conversation = { id, title: "New conversation", createdAt: now, updatedAt: now, messages: [] };
        set((s) => ({ conversations: [convo, ...s.conversations], activeId: id }));
        return id;
      },

      selectConversation: (id) => set({ activeId: id }),

      deleteConversation: (id) => {
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
          return { conversations, activeId };
        });
      },

      renameConversation: (id, title) => {
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
      },

      abort: () => {
        activeAbort?.abort();
        set({ sending: false, streamStatus: "idle" });
      },

      sendMessage: async (text, attachments) => {
        let { activeId } = get();
        if (!activeId) activeId = get().newConversation();
        const convoId = activeId;

        const userMsg: ChatMessage = {
          id: uid(),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
          attachments,
        };
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          steps: [],
          streaming: true,
        };

        const isFirstMessage = (get().conversations.find((c) => c.id === convoId)?.messages.length ?? 0) === 0;

        set((s) => ({
          sending: true,
          streamStatus: "connecting",
          conversations: s.conversations.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  title: isFirstMessage ? titleFromMessage(text, attachments?.[0]?.name) : c.title,
                  updatedAt: new Date().toISOString(),
                  messages: [...c.messages, userMsg, assistantMsg],
                }
              : c,
          ),
        }));

        const updateAssistant = (mutator: (m: ChatMessage) => ChatMessage) => {
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id !== convoId
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) => (m.id === assistantMsg.id ? mutator(m) : m)),
                  },
            ),
          }));
        };

        const pushStep = (step: PipelineStep) =>
          updateAssistant((m) => ({ ...m, steps: [...(m.steps ?? []), step] }));

        const updateLastStep = (mutator: (step: PipelineStep) => PipelineStep) =>
          updateAssistant((m) => {
            const steps = [...(m.steps ?? [])];
            if (steps.length) steps[steps.length - 1] = mutator(steps[steps.length - 1]);
            return { ...m, steps };
          });

        activeAbort = new AbortController();
        const history = (get().conversations.find((c) => c.id === convoId)?.messages ?? [])
          .filter((m) => m.id !== assistantMsg.id)
          .map((m) => ({ role: m.role, content: m.content }));

        const docAttachment = attachments?.find((a) => typeof a.content === "string" && a.content.trim());

        try {
          set({ streamStatus: "live" });
          for await (const event of streamChatTurn(
            text,
            history,
            activeAbort.signal,
            docAttachment ? { name: docAttachment.name, content: docAttachment.content! } : null,
          )) {
            handleEvent(event, { pushStep, updateLastStep, updateAssistant });
          }
        } catch {
          updateAssistant((m) => ({
            ...m,
            content: m.content || "Something went wrong reaching Guardian's backend. Is it running?",
            streaming: false,
          }));
          set({ streamStatus: "error" });
        } finally {
          updateAssistant((m) => ({ ...m, streaming: false }));
          set({ sending: false });
        }
      },
    }),
    {
      name: "mcpg.chat.conversations",
      partialize: (s) => ({ conversations: s.conversations, activeId: s.activeId }),
    },
  ),
);

function handleEvent(
  event: ChatStreamEvent,
  handlers: {
    pushStep: (step: PipelineStep) => void;
    updateLastStep: (mutator: (step: PipelineStep) => PipelineStep) => void;
    updateAssistant: (mutator: (m: ChatMessage) => ChatMessage) => void;
  },
) {
  const { pushStep, updateLastStep, updateAssistant } = handlers;

  switch (event.type) {
    case "inbound_scan_start":
      pushStep({ kind: "inbound_scan", status: "scanning" });
      break;
    case "inbound_result":
      updateLastStep((s) =>
        s.kind === "inbound_scan"
          ? { kind: "inbound_scan", status: "done", result: verdictPayload(event as unknown as Record<string, unknown>) }
          : s,
      );
      break;
    case "thinking":
      pushStep({ kind: "thinking" });
      break;
    case "tool_call":
      pushStep({
        kind: "tool_call",
        tool: event.tool as ToolName,
        args: event.args,
        status: "running",
      });
      break;
    case "tool_result":
      updateLastStep((s) =>
        s.kind === "tool_call" ? { ...s, status: "done" } : s,
      );
      pushStep({
        kind: "tool_result",
        tool: event.tool as ToolName,
        content: event.content,
        isError: event.is_error,
        isLive: event.is_live,
      });
      break;
    case "guardian_scan_start":
      pushStep({ kind: "guardian_scan", status: "scanning" });
      break;
    case "guardian_verdict":
      updateLastStep((s) =>
        s.kind === "guardian_scan"
          ? { kind: "guardian_scan", status: "done", result: verdictPayload(event as unknown as Record<string, unknown>) }
          : s,
      );
      break;
    case "assistant_delta":
      updateAssistant((m) => ({ ...m, content: m.content + event.text }));
      break;
    case "error":
      updateAssistant((m) => ({ ...m, content: m.content || `Error: ${event.message}` }));
      break;
    case "done":
      break;
  }
}
