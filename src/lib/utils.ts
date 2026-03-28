import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns a stable index for today (UTC), cycling through `length` items. */
export function dayIndex(length: number): number {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  return daysSinceEpoch % length;
}

/** Split a name into up to 2 lines, breaking at a space or hard-cutting with ellipsis. */
export function splitName(name: string, maxChars: number): string[] {
  if (name.length <= maxChars) return [name];
  const mid = name.lastIndexOf(" ", maxChars);
  if (mid > 0) return [name.slice(0, mid), name.slice(mid + 1)];
  return [name.slice(0, maxChars) + "…"];
}
