const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnlyParts(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isDateOnlyString(value: string) {
  return parseDateOnlyParts(value) !== null;
}

export function dateOnlyToUtcDate(value: string): Date {
  const parts = parseDateOnlyParts(value);
  if (!parts) throw new Error("Invalid date-only value");

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function extractDateOnly(value: string): string | null {
  const dateOnly = value.slice(0, 10);
  return isDateOnlyString(dateOnly) ? dateOnly : null;
}

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDateOnlyForDisplay(value: string): string {
  const dateOnly = extractDateOnly(value);
  if (!dateOnly) return "-";

  return shortDateFormatter.format(dateOnlyToUtcDate(dateOnly));
}
