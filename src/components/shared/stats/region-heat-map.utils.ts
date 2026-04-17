import type { StatsPageData } from "@/lib/queries/stats";

export type RegionDatum = StatsPageData["regionDistribution"][number];
export type SpeciesDatum = StatsPageData["speciesBreakdown"][number];
export type RegionKey =
  | "north-america"
  | "central-south-america"
  | "europe"
  | "africa"
  | "asia"
  | "australia";

export interface RegionDefinition {
  key: RegionKey;
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
    key: "north-america",
    aliases: ["North America"],
    center: [39, -102],
    label: "North America",
    description: "Origins tied to North American species ranges.",
  },
  {
    key: "central-south-america",
    aliases: ["Central America", "Central/South America", "South America"],
    center: [3, -74],
    label: "Central and South America",
    description:
      "Species associated with Central and South American tropical and subtropical habitats.",
  },
  {
    key: "europe",
    aliases: ["Europe"],
    center: [54, 15],
    label: "Europe",
    description: "Species with documented European ranges.",
  },
  {
    key: "africa",
    aliases: ["Africa"],
    center: [2, 21],
    label: "Africa",
    description: "Species originating across African ecosystems.",
  },
  {
    key: "asia",
    aliases: ["Asia"],
    center: [28, 95],
    label: "Asia",
    description: "Species connected to Asian forest and lowland habitats.",
  },
  {
    key: "australia",
    aliases: ["Australia", "Oceania", "Australia and Oceania"],
    center: [-25, 134],
    label: "Australia",
    description: "Species associated with Australian and nearby island ranges.",
  },
];

function normalizeRawLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

const REGION_ALIAS_TO_KEY = new Map<string, RegionKey>(
  REGION_DEFINITIONS.flatMap((region) =>
    region.aliases.map((alias) => [normalizeRawLabel(alias), region.key] as const),
  ),
);

const REGION_BY_KEY = new Map<RegionKey, RegionDefinition>(
  REGION_DEFINITIONS.map((region) => [region.key, region] as const),
);

export function getRegionKeyForLabel(label: string): RegionKey | null {
  return REGION_ALIAS_TO_KEY.get(normalizeRawLabel(label)) ?? null;
}

export function normalizeRegionLabel(label: string): string | null {
  const key = getRegionKeyForLabel(label);
  if (!key) return null;
  return REGION_BY_KEY.get(key)?.label ?? null;
}

export function toHeatScale(value: number, max: number): number {
  if (max <= 0) return 0;
  return value / max;
}

export function getHeatColor(value: number, max: number): string {
  const intensity = toHeatScale(value, max);

  if (intensity >= 0.85) return "#4a7f63";
  if (intensity >= 0.65) return "#679a78";
  if (intensity >= 0.45) return "#83b48e";
  if (intensity >= 0.2) return "#9fc9a5";
  return "#bad9ba";
}

export function getHeatRadius(value: number, max: number): number {
  const intensity = toHeatScale(value, max);
  return 400000 + intensity * 1700000;
}

export function buildMappedRegions(data: RegionDatum[]): MappedRegion[] {
  const countsByKey = new Map<RegionKey, number>();
  const sourceLabelsByKey = new Map<RegionKey, Set<string>>();

  for (const entry of data) {
    const key = getRegionKeyForLabel(entry.name);
    if (!key) continue;

    countsByKey.set(key, (countsByKey.get(key) ?? 0) + entry.count);

    if (!sourceLabelsByKey.has(key)) {
      sourceLabelsByKey.set(key, new Set());
    }
    sourceLabelsByKey.get(key)?.add(entry.name.trim());
  }

  return REGION_DEFINITIONS.map((region) => ({
    ...region,
    count: countsByKey.get(region.key) ?? 0,
    sourceLabels: [...(sourceLabelsByKey.get(region.key) ?? new Set<string>())],
  })).filter((region) => region.count > 0);
}

export function findUnmappedRegions(data: RegionDatum[]) {
  return data.filter((entry) => !getRegionKeyForLabel(entry.name) && entry.count > 0);
}

export function getRegionLabelForRange(range: string[]): string | null {
  for (const rawLabel of range) {
    const normalized = normalizeRegionLabel(rawLabel);
    if (normalized) return normalized;
  }

  return null;
}

export function speciesBelongsToRegion(species: SpeciesDatum, regionLabel: string): boolean {
  const targetRegionKey = getRegionKeyForLabel(regionLabel);
  if (!targetRegionKey) return false;

  return species.range.some(
    (rawRangeLabel) => getRegionKeyForLabel(rawRangeLabel) === targetRegionKey,
  );
}
