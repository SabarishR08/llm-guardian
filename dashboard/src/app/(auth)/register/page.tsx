"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuth } from "@/features/auth/store";
import { cn } from "@/lib/utils";

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = [
    "var(--block)",
    "var(--block)",
    "var(--quarantine)",
    "var(--sanitize)",
    "var(--allow)",
    "var(--allow)",
  ];
  return { score, label: labels[score], color: colors[score] };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, status, clearError } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const loading = status === "loading";
  const s = strength(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await register(name, email, password);
    if (ok) router.push("/chat");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Deploy Guardian in front of your agents in minutes.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Alex Rivera"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) clearError();
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) clearError();
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) clearError();
            }}
            required
          />
          {password && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex flex-1 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        i < s.score ? s.color : "var(--border-strong)",
                    }}
                  />
                ))}
              </div>
              <span
                className="w-16 text-right text-[0.7rem]"
                style={{ color: s.color }}
              >
                {s.label}
              </span>
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-2 rounded-lg border border-block/25 bg-block/8 px-3 py-2 text-xs text-block"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </motion.div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <ul className="mt-5 space-y-1.5 text-xs text-subtle">
        {["No credit card required", "Free during the hackathon", "Runs locally"].map(
          (t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-3.5 text-allow" />
              {t}
            </li>
          ),
        )}
      </ul>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className={cn("font-medium text-primary-bright hover:underline")}>
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
