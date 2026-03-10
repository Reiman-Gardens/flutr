import { z } from "zod";

const htmlTagPattern = /<[^>]*>/g;

export function stripHtml(input: string) {
  return input.replace(htmlTagPattern, "");
}

export function sanitizeText(input: string) {
  return stripHtml(input).trim();
}

/**
 * Sanitize + trim first, then enforce non-empty.
 * Use this instead of `.min(1).transform(sanitizeText)` to prevent
 * whitespace-only or HTML-only strings from passing validation.
 */
export function sanitizedNonEmpty(maxLength: number) {
  return z.string().max(maxLength).transform(sanitizeText).pipe(z.string().min(1));
}
