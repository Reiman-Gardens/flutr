/** WCAG relative luminance of a `#rrggbb` color, or `null` if it isn't one. */
export function relativeLuminance(hex: string): number | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const int = Number.parseInt(match[1], 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Foreground color that stays legible on `hex`.
 *
 * Institution theme colors override `--primary` for a whole tenant, but
 * `--primary-foreground` is a fixed token that flips between light and dark
 * mode — so without this it can land dark-on-dark. 0.179 is the luminance
 * where contrast against white and against black are equal.
 */
export function readableForeground(hex: string): string | null {
  const luminance = relativeLuminance(hex);
  if (luminance === null) return null;
  return luminance > 0.179 ? "#111111" : "#ffffff";
}
