import { API_BASE_URL } from "@/lib/api/config";

export interface McpToolResult {
  tool: string;
  arguments: Record<string, unknown>;
  raw_response: string;
  tool_reported_error: boolean;
  guardian_verdict: {
    riskScore: number;
    category: string;
    verdict: string;
    severity: string;
    explanation: string;
    recommendedAction: string;
    signals: unknown[];
  };
}

/** Whether the real sandboxed MCP filesystem server is reachable. */
export async function mcpStatus(): Promise<{ available: boolean; server: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/mcp/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function mcpListTools(): Promise<{ name: string; description: string }[]> {
  const res = await fetch(`${API_BASE_URL}/api/mcp/tools`);
  if (!res.ok) throw new Error("MCP server unavailable");
  const data = await res.json();
  return data.tools;
}

/** Call a real tool on the real sandboxed MCP server and get Guardian's real verdict. */
export async function mcpCallTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const res = await fetch(`${API_BASE_URL}/api/mcp/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
  if (!res.ok) throw new Error(`MCP call failed: ${res.status}`);
  return res.json();
}
