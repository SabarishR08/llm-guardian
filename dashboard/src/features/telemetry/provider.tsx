"use client";

import * as React from "react";
import { useTelemetry } from "./store";
import { generateEvent } from "./mock-stream";
import { DEMO_MODE, WS_URL } from "@/lib/api/config";
import { checkBackendHealth } from "@/lib/api/client";
import type { GuardianEvent } from "@/lib/types";

/** How often to poll /api/stats + /api/events when in REST-only mode. */
const REST_POLL_MS = 10_000;
/** How often to refresh KPIs when WebSocket is connected. */
const WS_STATS_POLL_MS = 30_000;
/** How many ms to wait for WS handshake before falling back to REST-only. */
const WS_CONNECT_TIMEOUT_MS = 4_000;

/**
 * Drives the live telemetry.
 *
 * Demo mode     → in-browser simulator (no backend needed).
 * Live/WS mode  → WebSocket stream + REST hydration on connect
 *                 + 30 s /api/stats poll.
 * REST-only mode → backend reachable via HTTP but WS unavailable
 *                 (e.g. reverse-proxy strips Upgrade headers); falls back to
 *                 10 s polling of /api/stats + /api/events.  Shows "live"
 *                 status, not "offline".
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const hydrateMock    = useTelemetry((s) => s.hydrateMock);
  const hydrateFromApi = useTelemetry((s) => s.hydrateFromApi);
  const refreshStats   = useTelemetry((s) => s.refreshStats);
  const ingest         = useTelemetry((s) => s.ingest);
  const setConnection  = useTelemetry((s) => s.setConnection);

  React.useEffect(() => {
    let stopped = false;
    let simulatorTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let ws: WebSocket | null = null;

    // ── Poll helpers ───────────────────────────────────────────────────────
    const stopPoll = () => {
      if (pollTimer !== undefined) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
    };

    const startStatsPoll = (intervalMs: number) => {
      stopPoll();
      pollTimer = setInterval(() => {
        if (!stopped) void refreshStats();
      }, intervalMs);
    };

    /**
     * REST-only mode: every REST_POLL_MS we do a full hydrateFromApi() so
     * newly-seen events roll into the traffic chart and the live feed.
     * The heavy path re-fetches /api/events which is cheap (<1 ms on the
     * in-memory store), so 10 s is fine.
     */
    const startRestOnlyPoll = () => {
      stopPoll();
      pollTimer = setInterval(() => {
        if (!stopped) void hydrateFromApi();
      }, REST_POLL_MS);
    };

    // ── Demo mode ──────────────────────────────────────────────────────────
    const runSimulator = () => {
      setConnection("demo");
      hydrateMock();
      const tick = () => {
        if (stopped) return;
        const burst = Math.random() < 0.15 ? 3 : 1;
        for (let i = 0; i < burst; i++) ingest(generateEvent());
        simulatorTimer = setTimeout(tick, 700 + Math.random() * 1600);
      };
      tick();
    };

    // ── REST-only fallback ─────────────────────────────────────────────────
    const runRestOnly = () => {
      if (stopped) return;
      setConnection("live"); // REST is live enough — don't say "offline"
      void hydrateFromApi();
      startRestOnlyPoll();
    };

    // ── Live WebSocket mode ────────────────────────────────────────────────
    const connectLiveStream = () => {
      if (stopped) return;
      setConnection("connecting");

      try {
        ws = new WebSocket(WS_URL);

        // If the socket doesn't open within the timeout, fall back to REST.
        const connectTimeout = setTimeout(() => {
          if (!stopped && ws && ws.readyState !== WebSocket.OPEN) {
            ws.onopen    = null;
            ws.onmessage = null;
            ws.onerror   = null;
            ws.onclose   = null;
            try { ws.close(); } catch { /* ignore */ }
            ws = null;
            // Check whether the REST API itself is reachable before giving up.
            void checkBackendHealth().then((alive) => {
              if (stopped) return;
              if (alive) {
                runRestOnly();
              } else {
                setConnection("offline");
                reconnectTimer = setTimeout(connectLiveStream, 5_000);
              }
            });
          }
        }, WS_CONNECT_TIMEOUT_MS);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          setConnection("live");
          void hydrateFromApi();
          startStatsPoll(WS_STATS_POLL_MS);
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data) as GuardianEvent;
            ingest(data);
          } catch {
            /* ignore malformed frames */
          }
        };

        ws.onerror = () => {
          clearTimeout(connectTimeout);
          stopPoll();
          // Don't immediately mark offline — try REST fallback first.
          void checkBackendHealth().then((alive) => {
            if (stopped) return;
            if (alive) {
              runRestOnly();
            } else {
              setConnection("offline");
              reconnectTimer = setTimeout(connectLiveStream, 3_000);
            }
          });
        };

        ws.onclose = () => {
          clearTimeout(connectTimeout);
          if (!stopped) {
            stopPoll();
            // Attempt WS reconnect; if that also fails, runRestOnly handles it.
            reconnectTimer = setTimeout(connectLiveStream, 2_000);
          }
        };
      } catch {
        stopPoll();
        void checkBackendHealth().then((alive) => {
          if (stopped) return;
          if (alive) {
            runRestOnly();
          } else {
            setConnection("offline");
            reconnectTimer = setTimeout(connectLiveStream, 5_000);
          }
        });
      }
    };

    // ── Boot ───────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      runSimulator();
    } else {
      connectLiveStream();
    }

    return () => {
      stopped = true;
      if (simulatorTimer) clearTimeout(simulatorTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPoll();
      if (ws) {
        ws.onopen    = null;
        ws.onmessage = null;
        ws.onerror   = null;
        ws.onclose   = null;
        try { ws.close(); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
