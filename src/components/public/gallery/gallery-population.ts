import type { GallerySpecies } from "@/lib/queries/gallery";
import type { SortField } from "@/hooks/use-species-search";

/**
 * Gallery-specific population rule: which species are eligible to appear at all for a given
 * sort mode. In Flight sorts (High-Low and Low-High share this rule) show only currently
 * in-flight species; every other sort shows the full input population unchanged.
 *
 * This decides population only — it never sorts, searches, filters by family, paginates, knows
 * about showGlobal, touches URL state, or mutates its input. Order is sortSpecies/
 * compareSpecies's responsibility, applied separately and afterward.
 */
export function selectGalleryPopulation(
  species: GallerySpecies[],
  sortField: SortField,
): GallerySpecies[] {
  if (sortField === "in_flight") {
    return species.filter((item) => item.in_flight_count > 0);
  }
  return species;
}
