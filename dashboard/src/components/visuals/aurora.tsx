import { cn } from "@/lib/utils";

/**
 * Ambient aurora - layered, blurred gradient orbs behind hero/section content.
 * Purely decorative; pointer-events disabled.
 */
export function Aurora({
  className,
  intensity = "default",
}: {
  className?: string;
  intensity?: "subtle" | "default" | "vivid";
}) {
  const opacity =
    intensity === "vivid" ? "opacity-90" : intensity === "subtle" ? "opacity-40" : "opacity-70";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        opacity,
        className,
      )}
    >
      <div
        className="animate-aurora absolute -left-[10%] top-[-20%] h-[42rem] w-[42rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in oklch, var(--primary) 55%, transparent), transparent 65%)",
        }}
      />
      <div
        className="animate-aurora absolute right-[-10%] top-[6%] h-[38rem] w-[38rem] rounded-full blur-[130px]"
        style={{
          animationDelay: "-7s",
          background:
            "radial-gradient(circle at center, color-mix(in oklch, var(--accent-violet) 45%, transparent), transparent 65%)",
        }}
      />
      <div
        className="animate-aurora absolute left-[30%] top-[30%] h-[34rem] w-[34rem] rounded-full blur-[140px]"
        style={{
          animationDelay: "-13s",
          background:
            "radial-gradient(circle at center, color-mix(in oklch, var(--accent-cyan) 35%, transparent), transparent 65%)",
        }}
      />
    </div>
  );
}
