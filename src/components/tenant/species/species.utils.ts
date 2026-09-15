export type SpeciesScope = "mine" | "all";

export interface TenantSpeciesSummary {
  id: number;
  scientificName: string;
  family: string;
  subFamily: string;
  range: string[];

  /** Global catalog value. */
  commonName: string;
  /** Institution-specific value, or null when not overridden. */
  commonNameOverride: string | null;

  /** Global catalog value. */
  lifespanDays: number;
  /** Institution-specific value, or null when not overridden. */
  lifespanOverride: number | null;

  /** True when the institution carries this species (has a link row). */
  isLinked: boolean;
}

/** Overrides the institution has saved for one species. */
export interface SpeciesOverrideValues {
  commonNameOverride: string | null;
  lifespanOverride: number | null;
}

/**
 * Resolve the common name shown to visitors.
 *
 * Mirrors `row.common_name_override ?? row.common_name` in the read queries, but also
 * treats an empty/whitespace-only override as absent so a blank value can never render.
 */
export function resolveCommonName(species: TenantSpeciesSummary): string {
  const override = species.commonNameOverride?.trim();
  return override ? override : species.commonName;
}

/** Resolve the lifespan in days shown to visitors. */
export function resolveLifespan(species: TenantSpeciesSummary): number {
  const override = species.lifespanOverride;
  return override !== null && override > 0 ? override : species.lifespanDays;
}

/** True when the institution has customised either field. */
export function hasOverride(species: TenantSpeciesSummary): boolean {
  return (
    Boolean(species.commonNameOverride?.trim()) ||
    (species.lifespanOverride !== null && species.lifespanOverride > 0)
  );
}

/**
 * Filter by scope ("mine" keeps only carried species) then by a case-insensitive
 * substring search, and sort by scientific name.
 */
export function filterSpecies(
  species: TenantSpeciesSummary[],
  search: string,
  scope: SpeciesScope,
): TenantSpeciesSummary[] {
  const normalizedSearch = search.trim().toLowerCase();

  return species
    .filter((item) => {
      if (scope === "mine" && !item.isLinked) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        resolveCommonName(item),
        item.commonName,
        item.scientificName,
        item.family,
        item.subFamily,
        item.range.join(" "),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((a, b) => a.scientificName.localeCompare(b.scientificName));
}
