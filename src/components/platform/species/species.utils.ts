export interface PlatformSpeciesSummary {
  id: number;
  scientificName: string;
  commonName: string;
  family: string;
  subFamily: string;
  lifespanDays: number;
  range: string[];
  createdAt: string;
}

export interface PlatformSpeciesRecord extends PlatformSpeciesSummary {
  description: string | null;
  hostPlant: string | null;
  habitat: string | null;
  funFacts: string | null;
  imgWingsOpen: string | null;
  imgWingsClosed: string | null;
  extraImg1: string | null;
  extraImg2: string | null;
  updatedAt: string;
}

type SpeciesApiRecord = {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  sub_family: string;
  lifespan_days: number;
  range: string[];
  description: string | null;
  host_plant: string | null;
  habitat: string | null;
  fun_facts: string | null;
  img_wings_open: string | null;
  img_wings_closed: string | null;
  extra_img_1: string | null;
  extra_img_2: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export function normalizePlatformSpecies(record: SpeciesApiRecord): PlatformSpeciesRecord {
  return {
    id: record.id,
    scientificName: record.scientific_name,
    commonName: record.common_name,
    family: record.family,
    subFamily: record.sub_family,
    lifespanDays: record.lifespan_days,
    range: record.range,
    description: record.description,
    hostPlant: record.host_plant,
    habitat: record.habitat,
    funFacts: record.fun_facts,
    imgWingsOpen: record.img_wings_open,
    imgWingsClosed: record.img_wings_closed,
    extraImg1: record.extra_img_1,
    extraImg2: record.extra_img_2,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

export function toPlatformSpeciesSummary(record: PlatformSpeciesRecord): PlatformSpeciesSummary {
  return {
    id: record.id,
    scientificName: record.scientificName,
    commonName: record.commonName,
    family: record.family,
    subFamily: record.subFamily,
    lifespanDays: record.lifespanDays,
    range: record.range,
    createdAt: record.createdAt,
  };
}

export function filterSpecies(species: PlatformSpeciesSummary[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  return [...species]
    .filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        item.commonName,
        item.scientificName,
        item.family,
        item.subFamily,
        item.range.join(" "),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((a, b) => a.scientificName.localeCompare(b.scientificName));
}

export function parseRangeInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function formatRangeInput(range: string[]) {
  return range.join("\n");
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}
