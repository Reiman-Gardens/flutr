import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { butterfly_species, butterfly_species_institution } from "@/lib/schema";
import { currentInFlightBySpeciesSubquery } from "@/lib/queries/inflight";

export interface GallerySpecies {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  range: string[];
  in_flight_count: number;
}

/** Base gallery query selecting all species columns for an institution (cached per request). */
const queryGallerySpecies = cache(async (institutionId: number) => {
  const currentInFlight = currentInFlightBySpeciesSubquery(institutionId);

  return db
    .select({
      id: butterfly_species.id,
      scientific_name: butterfly_species.scientific_name,
      common_name: butterfly_species.common_name,
      common_name_override: butterfly_species_institution.common_name_override,
      family: butterfly_species.family,
      range: butterfly_species.range,
      in_flight_count: sql<number>`coalesce(${currentInFlight.quantity}, 0)`.as("in_flight_count"),
    })
    .from(butterfly_species_institution)
    .innerJoin(
      butterfly_species,
      eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
    )
    .leftJoin(currentInFlight, eq(currentInFlight.butterfly_species_id, butterfly_species.id))
    .where(eq(butterfly_species_institution.institution_id, institutionId))
    .orderBy(butterfly_species.common_name);
});

/** Resolve overrides and return gallery-ready species list. */
function resolveOverrides(rows: Awaited<ReturnType<typeof queryGallerySpecies>>): GallerySpecies[] {
  return rows.map((row) => ({
    id: row.id,
    scientific_name: row.scientific_name,
    common_name: row.common_name_override ?? row.common_name,
    family: row.family,
    range: row.range,
    in_flight_count: Number(row.in_flight_count),
  }));
}

/**
 * Gallery species for an institution (page-level).
 * Returns the full institution-associated species set, including species with
 * in_flight_count === 0 — Gallery population/eligibility (e.g. in-flight-only vs.
 * full historical set, depending on the selected sort mode) is a client-side concern,
 * not this function's responsibility. See selectGalleryPopulation.
 */
export async function getGalleryData(institutionId: number) {
  const rows = await queryGallerySpecies(institutionId);
  return { species: resolveOverrides(rows) };
}

/** All global species for the gallery's "Show all species" toggle (cached per request). */
export const getGalleryGlobalSpecies = cache(
  async (institutionId?: number): Promise<GallerySpecies[]> => {
    const rows =
      institutionId === undefined
        ? await db
            .select({
              id: butterfly_species.id,
              scientific_name: butterfly_species.scientific_name,
              common_name: butterfly_species.common_name,
              family: butterfly_species.family,
              range: butterfly_species.range,
              in_flight_count: sql<number>`0`.as("in_flight_count"),
            })
            .from(butterfly_species)
            .orderBy(asc(butterfly_species.common_name))
        : await (async () => {
            const currentInFlight = currentInFlightBySpeciesSubquery(institutionId);
            return db
              .select({
                id: butterfly_species.id,
                scientific_name: butterfly_species.scientific_name,
                common_name: butterfly_species.common_name,
                family: butterfly_species.family,
                range: butterfly_species.range,
                in_flight_count: sql<number>`coalesce(${currentInFlight.quantity}, 0)`.as(
                  "in_flight_count",
                ),
              })
              .from(butterfly_species)
              .leftJoin(
                currentInFlight,
                eq(currentInFlight.butterfly_species_id, butterfly_species.id),
              )
              .orderBy(asc(butterfly_species.common_name));
          })();

    return rows.map((row) => ({
      id: row.id,
      scientific_name: row.scientific_name,
      common_name: row.common_name,
      family: row.family,
      range: row.range,
      in_flight_count: Number(row.in_flight_count),
    }));
  },
);

/** Gallery species for the API route (same shape, kept separate for clarity). */
export async function getGalleryDetailData(institutionId: number) {
  const rows = await queryGallerySpecies(institutionId);
  return resolveOverrides(rows);
}
