import { cache } from "react";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  butterfly_species,
  butterfly_species_institution,
  shipment_items,
  in_flight,
} from "@/lib/schema";

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
      in_flight_count: sql<number>`coalesce((
        select sum(${in_flight.quantity})
        from ${in_flight}
        inner join ${shipment_items}
          on ${in_flight.institution_id} = ${shipment_items.institution_id}
          and ${in_flight.shipment_item_id} = ${shipment_items.id}
        where ${in_flight.institution_id} = ${institutionId}
          and ${shipment_items.butterfly_species_id} = ${butterfly_species.id}
      ), 0)`.as("in_flight_count"),
    })
    .from(butterfly_species_institution)
    .innerJoin(
      butterfly_species,
      eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
    )
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

/** Gallery species with all image columns (API route). */
export async function getGalleryDetailData(institutionId: number) {
  const rows = await queryGallerySpecies(institutionId);
  return resolveOverrides(rows);
}
