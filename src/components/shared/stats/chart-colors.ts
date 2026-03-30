/**
 * Shared color palette for stats charts.
 * Darkened tones (~0.47–0.55 OKLCH lightness) ensure white text meets
 * WCAG AA 4.5:1 contrast ratio without needing drop-shadow workarounds.
 */
export const CHART_COLORS = [
  "oklch(0.52 0.22 30)",
  "oklch(0.50 0.20 265)",
  "oklch(0.50 0.18 145)",
  "oklch(0.50 0.22 330)",
  "oklch(0.52 0.16 85)",
  "oklch(0.48 0.18 290)",
  "oklch(0.50 0.16 175)",
  "oklch(0.52 0.20 15)",
  "oklch(0.50 0.14 110)",
  "oklch(0.48 0.16 240)",
  "oklch(0.52 0.20 50)",
  "oklch(0.48 0.18 310)",
  "oklch(0.50 0.12 195)",
  "oklch(0.52 0.18 0)",
  "oklch(0.50 0.14 70)",
  "oklch(0.49 0.20 350)",
  "oklch(0.50 0.16 130)",
  "oklch(0.48 0.18 220)",
  "oklch(0.50 0.20 280)",
  "oklch(0.50 0.14 160)",
  "oklch(0.47 0.16 305)",
  "oklch(0.52 0.18 40)",
  "oklch(0.50 0.12 190)",
  "oklch(0.49 0.20 255)",
  "oklch(0.50 0.14 100)",
];

export function getChartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
