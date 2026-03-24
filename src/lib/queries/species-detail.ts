import { cache } from "react";
import { eq, and, sql, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  butterfly_species,
  butterfly_species_institution,
  shipment_items,
  in_flight,
} from "@/lib/schema";

export interface SpeciesDetail {
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
  in_flight_count: number;
}

/**
 * Pre-aggregated in-flight counts per species for a given institution.
 * Single scan of in_flight + shipment_items instead of N correlated subqueries.
 */
function inFlightCountSubquery(institutionId: number) {
  return db
    .select({
      butterfly_species_id: shipment_items.butterfly_species_id,
      total: sum(in_flight.quantity).as("total"),
    })
    .from(in_flight)
    .innerJoin(
      shipment_items,
      and(
        eq(in_flight.institution_id, shipment_items.institution_id),
        eq(in_flight.shipment_item_id, shipment_items.id),
      ),
    )
    .where(eq(in_flight.institution_id, institutionId))
    .groupBy(shipment_items.butterfly_species_id)
    .as("ifc");
}

/** Species detail for a single species at an institution (cached per request). */
export const getSpeciesDetail = cache(
  async (institutionId: number, scientificName: string): Promise<SpeciesDetail | null> => {
    const ifc = inFlightCountSubquery(institutionId);

    const rows = await db
      .select({
        id: butterfly_species.id,
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        common_name_override: butterfly_species_institution.common_name_override,
        family: butterfly_species.family,
        sub_family: butterfly_species.sub_family,
        lifespan_days: butterfly_species.lifespan_days,
        lifespan_override: butterfly_species_institution.lifespan_override,
        range: butterfly_species.range,
        description: butterfly_species.description,
        host_plant: butterfly_species.host_plant,
        habitat: butterfly_species.habitat,
        fun_facts: butterfly_species.fun_facts,
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
      .where(
        and(
          eq(butterfly_species_institution.institution_id, institutionId),
          eq(butterfly_species.scientific_name, scientificName),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];

    return {
      id: row.id,
      scientific_name: row.scientific_name,
      common_name: row.common_name_override ?? row.common_name,
      family: row.family,
      sub_family: row.sub_family,
      lifespan_days: row.lifespan_override ?? row.lifespan_days,
      range: row.range,
      description: row.description,
      host_plant: row.host_plant,
      habitat: row.habitat,
      fun_facts: row.fun_facts,
      img_wings_open: row.img_wings_open,
      img_wings_closed: row.img_wings_closed,
      extra_img_1: row.extra_img_1,
      extra_img_2: row.extra_img_2,
      in_flight_count: Number(row.in_flight_count),
    };
  },
);
