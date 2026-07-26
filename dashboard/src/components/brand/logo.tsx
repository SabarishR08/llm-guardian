import { cn } from "@/lib/utils";

/** The Guardian glyph - a layered shield with an inner aperture. */
export function GuardianMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gm-fill" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary-bright)" />
          <stop offset="0.5" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent-indigo)" />
        </linearGradient>
        <linearGradient id="gm-stroke" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-cyan)" />
          <stop offset="1" stopColor="var(--accent-violet)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5l10.5 4v7.2c0 6.9-4.4 12.2-10.5 14.3C9.9 25.9 5.5 20.6 5.5 13.7V6.5L16 2.5z"
        fill="url(#gm-fill)"
        fillOpacity="0.16"
        stroke="url(#gm-stroke)"
        strokeWidth="1.4"
      />
      <path
        d="M16 8.5l5.5 2.1v3.4c0 3.6-2.3 6.4-5.5 7.5-3.2-1.1-5.5-3.9-5.5-7.5v-3.4L16 8.5z"
        stroke="url(#gm-fill)"
        strokeWidth="1.3"
        className={cn(animated && "animate-pulse-glow origin-center")}
      />
      <circle cx="16" cy="14.5" r="1.9" fill="var(--primary-bright)" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <GuardianMark />
      {showWordmark && (
        <span className="text-[0.98rem] font-semibold tracking-tight text-foreground">
          MCP Guardian
        </span>
      )}
    </span>
  );
}
