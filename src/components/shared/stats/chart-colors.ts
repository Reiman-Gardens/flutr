/**
 * Shared color palette for stats charts.
 * Lighter, vibrant tones (~0.58–0.65 OKLCH lightness). White text relies on
 * the drop-shadow applied by treemap/chart cell components for legibility.
 */
export const CHART_COLORS = [
  "oklch(0.62 0.22 30)",
  "oklch(0.58 0.20 265)",
  "oklch(0.64 0.18 145)",
  "oklch(0.60 0.22 330)",
  "oklch(0.65 0.16 85)",
  "oklch(0.55 0.18 290)",
  "oklch(0.62 0.16 175)",
  "oklch(0.60 0.20 15)",
  "oklch(0.63 0.14 110)",
  "oklch(0.58 0.16 240)",
  "oklch(0.65 0.20 50)",
  "oklch(0.58 0.18 310)",
  "oklch(0.62 0.12 195)",
  "oklch(0.60 0.18 0)",
  "oklch(0.64 0.14 70)",
  "oklch(0.59 0.20 350)",
  "oklch(0.63 0.16 130)",
  "oklch(0.56 0.18 220)",
  "oklch(0.58 0.20 280)",
  "oklch(0.64 0.14 160)",
  "oklch(0.57 0.16 305)",
  "oklch(0.62 0.18 40)",
  "oklch(0.60 0.12 190)",
  "oklch(0.59 0.20 255)",
  "oklch(0.63 0.14 100)",
];

export function getChartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
