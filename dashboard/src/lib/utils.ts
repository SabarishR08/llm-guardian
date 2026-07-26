import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes without style conflicts.
 * Combines `clsx` conditional logic with `tailwind-merge` de-duplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Format a number with thousands separators (e.g. 12345 -> "12,345"). */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Compact number formatting (e.g. 12345 -> "12.3K"). */
export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Build a stable React list key from a value and its position. */
export function createListKey(value: unknown, index: number) {
  if (value === null || value === undefined) {
    return `item-${index}`;
  }

  if (typeof value === "string") {
    return `${value}-${index}`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}-${index}`;
  }

  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const parts = [candidate.id, candidate.key, candidate.timestamp, candidate.title, candidate.name, candidate.slug]
      .filter((part): part is string | number | boolean => part !== undefined && part !== null)
      .map((part) => String(part));

    if (parts.length > 0) {
      return `${parts.join("::")}-${index}`;
    }
  }

  return `item-${index}`;
}
