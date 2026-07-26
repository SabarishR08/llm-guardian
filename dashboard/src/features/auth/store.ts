"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest, setAuthToken, ApiError } from "@/lib/api/client";
import { DEMO_MODE, TOKEN_STORAGE_KEY } from "@/lib/api/config";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  org: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<boolean>;
  loginWithDemo: () => Promise<boolean>;
  requestReset: (email: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const DEMO_USER: User = {
  id: "usr_demo",
  name: "Alex Rivera",
  email: "demo@mcpguardian.dev",
  role: "admin",
  org: "Acme Security",
};

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Analyst";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Build a plausible demo session so the dashboard works with no backend. */
function demoSession(email: string, name?: string): AuthResponse {
  return {
    access_token: `demo.${btoa(email).replace(/=/g, "")}.${Date.now()}`,
    user: {
      id: `usr_${Math.random().toString(36).slice(2, 9)}`,
      name: name ?? nameFromEmail(email),
      email,
      role: "admin",
      org: "Acme Security",
    },
  };
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      status: "idle",
      error: null,

      login: async (email, password) => {
        set({ status: "loading", error: null });
        if (!email.includes("@") || password.length < 6) {
          set({
            status: "error",
            error: "Enter a valid email and a password of at least 6 characters.",
          });
          return false;
        }
        try {
          let res: AuthResponse;
          if (DEMO_MODE) {
            res = demoSession(email);
          } else {
            res = await apiRequest<AuthResponse>("/api/auth/login", {
              method: "POST",
              body: { email, password },
            });
          }
          setAuthToken(res.access_token);
          set({
            user: res.user,
            token: res.access_token,
            status: "authenticated",
          });
          return true;
        } catch (err) {
          // Graceful fallback: if the backend is unreachable, allow demo entry.
          if (err instanceof ApiError && err.status === 0) {
            const res = demoSession(email);
            setAuthToken(res.access_token);
            set({
              user: res.user,
              token: res.access_token,
              status: "authenticated",
            });
            return true;
          }
          set({
            status: "error",
            error:
              err instanceof ApiError ? err.message : "Unable to sign in.",
          });
          return false;
        }
      },

      register: async (name, email, password) => {
        set({ status: "loading", error: null });
        if (name.trim().length < 2 || !email.includes("@") || password.length < 6) {
          set({
            status: "error",
            error: "Please complete all fields (password ≥ 6 characters).",
          });
          return false;
        }
        try {
          let res: AuthResponse;
          if (DEMO_MODE) {
            res = demoSession(email, name);
          } else {
            res = await apiRequest<AuthResponse>("/api/auth/register", {
              method: "POST",
              body: { name, email, password },
            });
          }
          setAuthToken(res.access_token);
          set({
            user: res.user,
            token: res.access_token,
            status: "authenticated",
          });
          return true;
        } catch (err) {
          if (err instanceof ApiError && err.status === 0) {
            const res = demoSession(email, name);
            setAuthToken(res.access_token);
            set({
              user: res.user,
              token: res.access_token,
              status: "authenticated",
            });
            return true;
          }
          set({
            status: "error",
            error:
              err instanceof ApiError ? err.message : "Unable to create account.",
          });
          return false;
        }
      },

      loginWithDemo: async () => {
        set({ status: "loading", error: null });
        const res = demoSession(DEMO_USER.email, DEMO_USER.name);
        setAuthToken(res.access_token);
        set({
          user: DEMO_USER,
          token: res.access_token,
          status: "authenticated",
        });
        return true;
      },

      requestReset: async (email) => {
        set({ status: "loading", error: null });
        if (!email.includes("@")) {
          set({ status: "error", error: "Enter a valid email address." });
          return false;
        }
        if (!DEMO_MODE) {
          try {
            await apiRequest("/api/auth/forgot", {
              method: "POST",
              body: { email },
            });
          } catch {
            /* Always report success to avoid account enumeration. */
          }
        }
        set({ status: "idle" });
        return true;
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, status: "idle", error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: TOKEN_STORAGE_KEY,
      partialize: (s) => ({ user: s.user, token: s.token, status: s.status }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);
