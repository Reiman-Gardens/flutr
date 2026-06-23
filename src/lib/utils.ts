import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns a stable index for today (UTC), cycling through `length` items. */
export function dayIndex(length: number): number {
  if (length <= 0) return 0;
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  return daysSinceEpoch % length;
}

/** Returns a stable daily index seeded by a tenant-specific value. */
export function seededDayIndex(length: number, seed: string | number): number {
  if (length <= 0) return 0;

  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  const input = `${seed}:${daysSinceEpoch}`;
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}

/**
 * Trigger a browser file download from a Blob.
 * Creates a temporary anchor element, clicks it, then cleans up.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Split a name into up to 2 lines, breaking at a space or hard-cutting with ellipsis. */
export function splitName(name: string, maxChars: number): string[] {
  if (name.length <= maxChars) return [name];
  const mid = name.lastIndexOf(" ", maxChars);
  if (mid > 0) {
    const second = name.slice(mid + 1);
    return [
      name.slice(0, mid),
      second.length > maxChars ? second.slice(0, maxChars - 1) + "…" : second,
    ];
  }
  return [name.slice(0, maxChars - 1) + "…"];
}
