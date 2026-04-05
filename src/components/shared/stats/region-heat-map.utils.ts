import type { StatsPageData } from "@/lib/queries/stats";

export type RegionDatum = StatsPageData["regionDistribution"][number];
export type SpeciesDatum = StatsPageData["speciesBreakdown"][number];

export interface RegionDefinition {
  aliases: string[];
  center: [number, number];
  label: string;
  description: string;
}

export interface MappedRegion extends RegionDefinition {
  count: number;
  sourceLabels: string[];
}

export const REGION_DEFINITIONS: RegionDefinition[] = [
  {
    aliases: ["North America"],
    center: [39, -102],
    label: "North America",
    description: "Origins tied to North American species ranges.",
  },
  {
    aliases: ["Central America", "Central/South America", "South America"],
    center: [-8, -67],
    label: "Central and South America",
    description: "Tropical and subtropical species from Latin American habitats.",
  },
  {
    aliases: ["Europe"],
    center: [54, 15],
    label: "Europe",
    description: "Species with documented European ranges.",
  },
  {
    aliases: ["Africa"],
    center: [2, 21],
    label: "Africa",
    description: "Species originating across African ecosystems.",
  },
  {
    aliases: ["Asia"],
    center: [28, 95],
    label: "Asia",
    description: "Species connected to Asian forest and lowland habitats.",
  },
  {
    aliases: ["Australia", "Oceania"],
    center: [-25, 134],
    label: "Australia and Oceania",
    description: "Species associated with Australian and nearby island ranges.",
  },
];

export function toHeatScale(value: number, max: number): number {
  if (max <= 0) return 0;
  return value / max;
}

export function getHeatColor(value: number, max: number): string {
  const intensity = toHeatScale(value, max);

  if (intensity >= 0.85) return "#b91c1c";
  if (intensity >= 0.65) return "#ea580c";
  if (intensity >= 0.45) return "#f59e0b";
  if (intensity >= 0.2) return "#facc15";
  return "#86efac";
}

export function getHeatRadius(value: number, max: number): number {
  const intensity = toHeatScale(value, max);
  return 400000 + intensity * 1700000;
}

export function buildMappedRegions(data: RegionDatum[]): MappedRegion[] {
  return REGION_DEFINITIONS.map((region) => {
    const totalCount = region.aliases.reduce(
      (sum, alias) => sum + (data.find((entry) => entry.name === alias)?.count ?? 0),
      0,
    );

    return {
      ...region,
      count: totalCount,
      sourceLabels: data
        .filter((entry) => region.aliases.includes(entry.name))
        .map((entry) => entry.name),
    };
  }).filter((region) => region.count > 0);
}

export function findUnmappedRegions(data: RegionDatum[]) {
  return data.filter(
    (entry) =>
      !REGION_DEFINITIONS.some((region) => region.aliases.includes(entry.name)) && entry.count > 0,
  );
}

export function getRegionLabelForRange(range: string[]): string | null {
  for (const label of range) {
    const match = REGION_DEFINITIONS.find((region) => region.aliases.includes(label));
    if (match) return match.label;
  }

  return null;
}

export function speciesBelongsToRegion(species: SpeciesDatum, regionLabel: string): boolean {
  return getRegionLabelForRange(species.range) === regionLabel;
}
