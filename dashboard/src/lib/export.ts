import type { GuardianEvent } from "./types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export function exportEventsCSV(events: GuardianEvent[]) {
  const headers = [
    "id",
    "timestamp",
    "direction",
    "source",
    "target",
    "tool",
    "category",
    "verdict",
    "severity",
    "riskScore",
    "latencyMs",
    "explanation",
  ];
  const rows = events.map((e) =>
    [
      e.id,
      e.timestamp,
      e.direction,
      e.source,
      e.target,
      e.tool ?? "",
      e.category,
      e.verdict,
      e.severity,
      e.riskScore,
      e.latencyMs,
      `"${e.explanation.replace(/"/g, '""')}"`,
    ].join(","),
  );
  download(
    `guardian-events-${stamp()}.csv`,
    [headers.join(","), ...rows].join("\n"),
    "text/csv",
  );
}

export function exportJSON(data: unknown, name: string) {
  download(`guardian-${name}-${stamp()}.json`, JSON.stringify(data, null, 2), "application/json");
}
