import { API_BASE_URL } from "@/lib/api/config";

/** Raw event shapes emitted by POST /api/chat/turn (SSE). */
export type ChatStreamEvent =
  | { type: "turn_start"; id: string; at: string }
  | { type: "inbound_scan_start" }
  | ({ type: "inbound_result" } & Record<string, unknown>)
  | { type: "thinking" }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "tool_result"; tool: string; content: string; is_error: boolean; is_live: boolean }
  | { type: "guardian_scan_start" }
  | ({ type: "guardian_verdict" } & Record<string, unknown>)
  | { type: "assistant_delta"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * POSTs a chat turn and yields each SSE event as it arrives. Uses fetch +
 * ReadableStream (not EventSource, which can't send a POST body) - this is
 * genuine server-sent streaming, not a client-side simulation.
 */
export async function* streamChatTurn(
  message: string,
  history: { role: string; content: string }[],
  signal?: AbortSignal,
  attachment?: { name: string; content: string } | null,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(`${API_BASE_URL}/api/chat/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, attachment: attachment ?? null }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(6)) as ChatStreamEvent;
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
