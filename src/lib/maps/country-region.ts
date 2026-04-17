import worldCountries from "world-countries";

import type { RegionKey } from "@/components/shared/stats/region-heat-map.utils";

const COUNTRY_ID_TO_REGION_KEY = new Map<string, RegionKey>();
const COUNTRY_NAME_TO_REGION_KEY = new Map<string, RegionKey>();

function normalizeCountryId(id: string | number): string {
  return String(Number(id));
}

function normalizeCountryName(name: string): string {
  return name.trim().toLowerCase();
}

function getRegionKeyForCountryMeta(
  region: string | undefined,
  subregion: string | undefined,
): RegionKey | null {
  const normalizedRegion = (region ?? "").trim().toLowerCase();
  const normalizedSubregion = (subregion ?? "").trim().toLowerCase();

  if (normalizedRegion === "africa") return "africa";
  if (normalizedRegion === "europe") return "europe";
  if (normalizedRegion === "asia") return "asia";
  if (normalizedRegion === "oceania") return "australia";

  if (normalizedRegion === "americas") {
    if (normalizedSubregion === "south america") return "south-america";
    if (normalizedSubregion === "northern america") return "north-america";
    if (normalizedSubregion === "central america") return "central-south-america";
    if (normalizedSubregion === "caribbean") return "central-south-america";
    return "north-america";
  }

  return null;
}

for (const country of worldCountries) {
  const key = getRegionKeyForCountryMeta(country.region, country.subregion);
  if (!key) continue;

  if (country.ccn3) {
    COUNTRY_ID_TO_REGION_KEY.set(normalizeCountryId(country.ccn3), key);
  }

  if (country.name.common) {
    COUNTRY_NAME_TO_REGION_KEY.set(normalizeCountryName(country.name.common), key);
  }

  if (country.name.official) {
    COUNTRY_NAME_TO_REGION_KEY.set(normalizeCountryName(country.name.official), key);
  }
}

// Known world-atlas country-name aliases that differ from world-countries naming.
COUNTRY_NAME_TO_REGION_KEY.set("w. sahara", "africa");
COUNTRY_NAME_TO_REGION_KEY.set("dem. rep. congo", "africa");
COUNTRY_NAME_TO_REGION_KEY.set("dominican rep.", "central-south-america");
COUNTRY_NAME_TO_REGION_KEY.set("bosnia and herz.", "europe");
COUNTRY_NAME_TO_REGION_KEY.set("central african rep.", "africa");
COUNTRY_NAME_TO_REGION_KEY.set("eq. guinea", "africa");
COUNTRY_NAME_TO_REGION_KEY.set("solomon is.", "australia");
COUNTRY_NAME_TO_REGION_KEY.set("falkland is.", "south-america");

export function getRegionKeyForCountry(
  countryId: string | number | undefined,
  countryName: string | undefined,
): RegionKey | null {
  if (countryId !== undefined && countryId !== null) {
    const byId = COUNTRY_ID_TO_REGION_KEY.get(normalizeCountryId(countryId));
    if (byId) return byId;
  }

  if (countryName) {
    return COUNTRY_NAME_TO_REGION_KEY.get(normalizeCountryName(countryName)) ?? null;
  }

  return null;
}
