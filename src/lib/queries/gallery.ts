import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { butterfly_species, butterfly_species_institution } from "@/lib/schema";
import { inFlightCountSubquery } from "@/lib/queries/subqueries";

export interface GallerySpecies {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  range: string[];
  img_wings_open: string | null;
  in_flight_count: number;
}

export interface GallerySpeciesDetail extends GallerySpecies {
  img_wings_closed: string | null;
  extra_img_1: string | null;
  extra_img_2: string | null;
}

/** Base gallery query selecting all species columns for an institution. */
async function queryGallerySpecies(institutionId: number) {
  const ifc = inFlightCountSubquery(institutionId);

  return db
    .select({
      id: butterfly_species.id,
      scientific_name: butterfly_species.scientific_name,
      common_name: butterfly_species.common_name,
      common_name_override: butterfly_species_institution.common_name_override,
      family: butterfly_species.family,
      range: butterfly_species.range,
      img_wings_open: butterfly_species.img_wings_open,
      img_wings_closed: butterfly_species.img_wings_closed,
      extra_img_1: butterfly_species.extra_img_1,
      extra_img_2: butterfly_species.extra_img_2,
      in_flight_count: sql<number>`coalesce(${ifc.total}, 0)`.as("in_flight_count"),
    })
    .from(butterfly_species_institution)
    .innerJoin(
      butterfly_species,
      eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
    )
    .leftJoin(ifc, eq(ifc.butterfly_species_id, butterfly_species.id))
    .where(eq(butterfly_species_institution.institution_id, institutionId))
    .orderBy(butterfly_species.common_name);
}

/** Resolve overrides and return gallery-ready species list. */
function resolveOverrides(
  rows: Awaited<ReturnType<typeof queryGallerySpecies>>,
): GallerySpeciesDetail[] {
  return rows.map((row) => ({
    id: row.id,
    scientific_name: row.scientific_name,
    common_name: row.common_name_override ?? row.common_name,
    family: row.family,
    range: row.range,
    img_wings_open: row.img_wings_open,
    img_wings_closed: row.img_wings_closed,
    extra_img_1: row.extra_img_1,
    extra_img_2: row.extra_img_2,
    in_flight_count: Number(row.in_flight_count),
  }));
}

/** Gallery species for an institution (page-level, cached per request). */
export const getGalleryData = cache(async (institutionId: number) => {
  const rows = await queryGallerySpecies(institutionId);
  const species: GallerySpecies[] = resolveOverrides(rows).map((item) => ({
    id: item.id,
    scientific_name: item.scientific_name,
    common_name: item.common_name,
    family: item.family,
    range: item.range,
    img_wings_open: item.img_wings_open,
    in_flight_count: item.in_flight_count,
  }));
  return { species };
});

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
              img_wings_open: butterfly_species.img_wings_open,
              in_flight_count: sql<number>`0`.as("in_flight_count"),
            })
            .from(butterfly_species)
            .orderBy(asc(butterfly_species.common_name))
        : await (async () => {
            const ifc = inFlightCountSubquery(institutionId);
            return db
              .select({
                id: butterfly_species.id,
                scientific_name: butterfly_species.scientific_name,
                common_name: butterfly_species.common_name,
                family: butterfly_species.family,
                range: butterfly_species.range,
                img_wings_open: butterfly_species.img_wings_open,
                in_flight_count: sql<number>`coalesce(${ifc.total}, 0)`.as("in_flight_count"),
              })
              .from(butterfly_species)
              .leftJoin(ifc, eq(ifc.butterfly_species_id, butterfly_species.id))
              .orderBy(asc(butterfly_species.common_name));
          })();

    return rows.map((row) => ({
      id: row.id,
      scientific_name: row.scientific_name,
      common_name: row.common_name,
      family: row.family,
      range: row.range,
      img_wings_open: row.img_wings_open,
      in_flight_count: Number(row.in_flight_count),
    }));
  },
);

/** Gallery species with all image columns (API route). */
export async function getGalleryDetailData(institutionId: number) {
  const rows = await queryGallerySpecies(institutionId);
  return resolveOverrides(rows);
}
