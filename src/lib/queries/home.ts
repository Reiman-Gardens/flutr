import { cache } from "react";
import { eq, and, sum, isNotNull, countDistinct, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  butterfly_species,
  butterfly_species_institution,
  shipment_items,
  in_flight,
} from "@/lib/schema";

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

/** In-flight stats and featured-species data for the institution home page. */
export const getInstitutionHomeData = cache(async (institutionId: number) => {
  const ifc = inFlightCountSubquery(institutionId);

  const [inFlightResult, speciesRows] = await Promise.all([
    // Total butterflies + distinct species in flight
    db
      .select({
        totalButterflies: sum(in_flight.quantity),
        totalSpecies: countDistinct(shipment_items.butterfly_species_id),
      })
      .from(in_flight)
      .innerJoin(
        shipment_items,
        and(
          eq(in_flight.institution_id, shipment_items.institution_id),
          eq(in_flight.shipment_item_id, shipment_items.id),
        ),
      )
      .where(eq(in_flight.institution_id, institutionId)),

    // Enabled species with images (for Butterfly of the Day)
    db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        img_wings_open: butterfly_species.img_wings_open,
        range: butterfly_species.range,
        lifespan_days: butterfly_species.lifespan_days,
        host_plant: butterfly_species.host_plant,
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
          isNotNull(butterfly_species.img_wings_open),
        ),
      )
      .orderBy(butterfly_species.scientific_name),
  ]);

  return {
    totalButterflies: Number(inFlightResult[0]?.totalButterflies ?? 0),
    totalSpecies: Number(inFlightResult[0]?.totalSpecies ?? 0),
    speciesRows,
  };
});
