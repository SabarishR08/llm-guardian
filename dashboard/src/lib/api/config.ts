/**
 * Runtime configuration for talking to the Guardian backend.
 *
 * The dashboard is designed to run standalone (demo mode) when no backend is
 * reachable, and to seamlessly upgrade to the live FastAPI service when
 * `NEXT_PUBLIC_API_URL` is set and healthy.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  API_BASE_URL.replace(/^http/, "ws") + "/ws/stream";

/** When true, the UI uses the built-in simulator/local analyzer instead of the API. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const TOKEN_STORAGE_KEY = "mcpg.session";
