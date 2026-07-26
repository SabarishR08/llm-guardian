"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Files,
  Loader2,
  Play,
  ServerOff,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { VERDICTS } from "@/lib/constants";
import type { Verdict } from "@/lib/types";
import { mcpCallTool, mcpStatus, type McpToolResult } from "@/features/mcp/live-tool";
import { cn } from "@/lib/utils";

const PRESETS = ["readme.txt", "quarterly-notes.md", "vendor-config.txt"];
type ToolName = "list_files" | "read_file";

/**
 * A genuinely live demo: lets the user call any tool with any argument on the
 * real, sandboxed filesystem MCP server, and shows Guardian's real verdict on
 * the real response. The sandbox is enforced server-side (server.py), so free
 * text input here is safe - the worst case is an honest "Access denied" or
 * "not found" error, which is itself part of the demo.
 */
export function LiveMcpPanel() {
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [tool, setTool] = React.useState<ToolName>("read_file");
  const [filename, setFilename] = React.useState("readme.txt");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<McpToolResult | null>(null);

  React.useEffect(() => {
    mcpStatus().then((s) => setAvailable(!!s?.available));
  }, []);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const args = tool === "read_file" ? { name: filename } : {};
      const res = await mcpCallTool(tool, args);
      setResult(res);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  if (available === null) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/40 p-4 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Checking for a live MCP server…
      </div>
    );
  }

  if (!available) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-card/30 p-4 text-sm text-muted">
        <ServerOff className="size-5 shrink-0 text-subtle" />
        <div>
          <p className="font-medium text-foreground">No live MCP server reachable</p>
          <p className="mt-0.5 text-xs">
            Start the backend and the sandboxed filesystem server (see{" "}
            <code className="rounded bg-surface px-1 py-0.5">mcp-servers/filesystem</code>)
            to try a real tool call.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-allow opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-allow" />
        </span>
        <p className="text-sm font-medium text-foreground">
          Live: call any tool, with any argument, on the real MCP server
        </p>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        This calls the real MCP protocol - no client-side validation. The
        sandbox is enforced on the server, so try to break it (
        <code className="rounded bg-surface px-1">../../backend/.env</code>,
        an absolute path, a file that doesn&apos;t exist) and see the real
        rejection come back.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={tool} onValueChange={(v) => setTool(v as ToolName)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read_file">read_file</SelectItem>
            <SelectItem value="list_files">list_files</SelectItem>
          </SelectContent>
        </Select>

        {tool === "read_file" && (
          <Input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="filename, e.g. readme.txt"
            className="flex-1 font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && !loading && run()}
          />
        )}

        <Button
          data-testid="mcp-run"
          onClick={run}
          disabled={loading || (tool === "read_file" && !filename.trim())}
          className="sm:w-auto"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          Run
        </Button>
      </div>

      {tool === "read_file" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`mcp-preset-${f}`}
              onClick={() => setFilename(f)}
              className="rounded-md border border-border bg-surface/50 px-2 py-1 font-mono text-[0.7rem] text-muted transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <FileText className="mr-1 inline size-3" />
              {f}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.tool + JSON.stringify(result.arguments) + Date.now()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3 border-t border-border pt-4"
          >
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
                {result.tool_reported_error ? (
                  <>
                    <AlertTriangle className="size-3 text-quarantine" />
                    Tool rejected the call (real error, sandbox working as intended)
                  </>
                ) : (
                  <>
                    <Files className="size-3" />
                    Raw tool response (real)
                  </>
                )}
              </div>
              <pre
                className={cn(
                  "max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border p-3 font-mono text-xs",
                  result.tool_reported_error
                    ? "border-quarantine/25 bg-quarantine/8 text-quarantine"
                    : "border-border bg-background/50 text-foreground/90",
                )}
              >
                {result.raw_response}
              </pre>
            </div>

            {!result.tool_reported_error && <VerdictRow result={result} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerdictRow({ result }: { result: McpToolResult }) {
  const v = VERDICTS[result.guardian_verdict.verdict as Verdict];
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3", v.bg, v.border)}>
      <v.icon className={cn("mt-0.5 size-4 shrink-0", v.color)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", v.color)}>{v.label}</span>
          <span className="font-mono text-xs text-subtle">
            risk {result.guardian_verdict.riskScore}/100
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {result.guardian_verdict.explanation}
        </p>
      </div>
      {result.guardian_verdict.verdict === "ALLOW" && (
        <ShieldCheck className="size-4 shrink-0 text-allow" />
      )}
    </div>
  );
}
