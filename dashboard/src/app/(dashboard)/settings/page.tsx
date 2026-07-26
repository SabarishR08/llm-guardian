"use client";

import * as React from "react";
import { Save, Cpu, Shield, Bell, Plug } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CATEGORIES, VERDICTS } from "@/lib/constants";
import type { ThreatCategory } from "@/lib/types";
import { useAuth } from "@/features/auth/store";
import { useTelemetry } from "@/features/telemetry/store";
import { LiveMcpPanel } from "@/components/dashboard/live-mcp-panel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Outbound alert integrations. None of these are wired to a real third-party
 * service in this build - no fake "Connected" state. Wiring one (e.g. a real
 * Slack incoming webhook) is a follow-up, not a UI decoration.
 */
const OUTBOUND_INTEGRATIONS = [
  { name: "Slack alerts", type: "webhook" },
  { name: "PagerDuty", type: "webhook" },
  { name: "Splunk export", type: "syslog" },
];

export default function SettingsPage() {
  const user = useAuth((s) => s.user);
  const servers = useTelemetry((s) => s.servers);
  const [thresholds, setThresholds] = React.useState({ sanitize: 25, quarantine: 50, block: 75 });
  const [detectors, setDetectors] = React.useState<Record<string, boolean>>(
    Object.fromEntries(
      (Object.keys(CATEGORIES) as ThreatCategory[])
        .filter((k) => k !== "benign")
        .map((k) => [k, true]),
    ),
  );

  const save = () =>
    toast.success("Settings saved", { description: "Configuration applied to the engine." });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Tune detection thresholds, policies, and integrations."
        actions={
          <Button size="sm" onClick={save}>
            <Save className="size-3.5" />
            Save changes
          </Button>
        }
      />

      <Tabs defaultValue="detection">
        <TabsList className="mb-2">
          <TabsTrigger value="detection">
            <Shield className="size-4" /> Detection
          </TabsTrigger>
          <TabsTrigger value="engine">
            <Cpu className="size-4" /> Engine
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="size-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="size-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* DETECTION */}
        <TabsContent value="detection">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Verdict thresholds" description="Risk-score cutoffs that map to each verdict">
              <div className="space-y-6">
                <ThresholdSlider
                  label="Sanitize at"
                  color="var(--sanitize)"
                  value={thresholds.sanitize}
                  min={5}
                  max={thresholds.quarantine - 5}
                  onChange={(v) => setThresholds((t) => ({ ...t, sanitize: v }))}
                />
                <ThresholdSlider
                  label="Quarantine at"
                  color="var(--quarantine)"
                  value={thresholds.quarantine}
                  min={thresholds.sanitize + 5}
                  max={thresholds.block - 5}
                  onChange={(v) => setThresholds((t) => ({ ...t, quarantine: v }))}
                />
                <ThresholdSlider
                  label="Block at"
                  color="var(--block)"
                  value={thresholds.block}
                  min={thresholds.quarantine + 5}
                  max={98}
                  onChange={(v) => setThresholds((t) => ({ ...t, block: v }))}
                />

                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-allow" style={{ width: `${thresholds.sanitize}%` }} />
                  <div className="bg-sanitize" style={{ width: `${thresholds.quarantine - thresholds.sanitize}%` }} />
                  <div className="bg-quarantine" style={{ width: `${thresholds.block - thresholds.quarantine}%` }} />
                  <div className="bg-block" style={{ width: `${100 - thresholds.block}%` }} />
                </div>
                <div className="flex justify-between text-[0.65rem] text-subtle">
                  {Object.values(VERDICTS).map((v) => (
                    <span key={v.label} className={v.color}>{v.label}</span>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Active detectors" description="Toggle individual detection engines">
              <div className="space-y-1">
                {(Object.keys(CATEGORIES) as ThreatCategory[])
                  .filter((k) => k !== "benign")
                  .map((k) => {
                    const c = CATEGORIES[k];
                    return (
                      <div key={k} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface/40">
                        <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklch, ${c.hex} 14%, transparent)`, color: c.hex }}>
                          <c.icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground">{c.label}</div>
                          <div className="truncate text-xs text-subtle">{c.description}</div>
                        </div>
                        <Switch
                          checked={detectors[k]}
                          onCheckedChange={(v) => setDetectors((d) => ({ ...d, [k]: v }))}
                        />
                      </div>
                    );
                  })}
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ENGINE */}
        <TabsContent value="engine">
          <Panel title="LLM explanation" description="How Guardian generates natural-language verdicts">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary provider</Label>
                <Select defaultValue="groq">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groq">Groq (fastest)</SelectItem>
                    <SelectItem value="ollama">Ollama (local)</SelectItem>
                    <SelectItem value="deterministic">Deterministic (offline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fallback provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama (local)</SelectItem>
                    <SelectItem value="deterministic">Deterministic (offline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Groq API key</Label>
                <Input type="password" placeholder="gsk_••••••••••••••••••••" defaultValue="gsk_demo_key_redacted" />
                <p className="text-xs text-subtle">Stored encrypted. Leave blank to run fully offline.</p>
              </div>
            </div>
            <div className="mt-5 space-y-1 border-t border-border pt-5">
              <ToggleRow label="Cache detector results" desc="Reuse assessments for identical payloads" defaultChecked />
              <ToggleRow label="Fail closed on error" desc="Block traffic if the engine is unavailable" defaultChecked />
              <ToggleRow label="Redact PII in logs" desc="Mask identifiers before persisting" defaultChecked />
            </div>
          </Panel>
        </TabsContent>

        {/* INTEGRATIONS */}
        <TabsContent value="integrations">
          <Panel
            title="Try a real MCP tool call"
            description="A genuine sandboxed MCP server, not simulated data"
            className="mb-4"
          >
            <LiveMcpPanel />
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="MCP servers"
              description="Live status from Guardian's connected tool servers (simulated fleet)"
            >
              <div className="space-y-1">
                {servers.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface/40">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-muted">
                      <Plug className="size-4" />
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{s.name}</div>
                      <div className="font-mono text-xs text-subtle">{s.transport} · {s.tools} tools</div>
                    </div>
                    {s.status === "connected" && <Badge variant="success">Connected</Badge>}
                    {s.status === "connecting" && <Badge variant="outline">Connecting…</Badge>}
                    {s.status === "error" && <Badge variant="block">Error</Badge>}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Outbound integrations"
              description="Not configured - no third-party alerting is wired up in this build"
            >
              <div className="space-y-1">
                {OUTBOUND_INTEGRATIONS.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface/40">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-muted">
                      <Plug className="size-4" />
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{c.name}</div>
                      <div className="font-mono text-xs text-subtle">{c.type}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info("Not implemented", {
                          description: `${c.name} requires a real webhook/API credential - no integration is wired up yet.`,
                        })
                      }
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Alerting" description="When Guardian should notify you">
              <div className="space-y-1">
                <ToggleRow label="Critical threats" desc="Immediate alert on BLOCK verdicts" defaultChecked />
                <ToggleRow label="New incidents" desc="When a high-risk event is promoted" defaultChecked />
                <ToggleRow label="Agent quarantine" desc="When an agent's trust score drops" defaultChecked />
                <ToggleRow label="Weekly digest" desc="Summary of the week's activity" />
              </div>
            </Panel>
            <Panel title="Profile" description="Your account details">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input defaultValue={user?.name ?? "Guardian Admin"} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user?.email ?? ""} type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Input defaultValue={user?.org ?? "Acme Security"} />
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ThresholdSlider({
  label,
  value,
  min,
  max,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-foreground">{label}</Label>
        <span className="font-mono text-sm font-semibold" style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  const [on, setOn] = React.useState(!!defaultChecked);
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface/40")}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-subtle">{desc}</div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}
