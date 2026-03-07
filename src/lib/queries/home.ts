import { cache } from "react";
import { eq, and, sum, isNotNull, countDistinct, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  butterfly_species,
  butterfly_species_institution,
  shipment_items,
  in_flight,
} from "@/lib/schema";

/** In-flight stats and featured-species data for the institution home page. */
export const getInstitutionHomeData = cache(async (institutionId: number) => {
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
    // Includes an `in_flight_count` scalar subquery so we don't need a sequential follow-up query
    db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        img_wings_open: butterfly_species.img_wings_open,
        range: butterfly_species.range,
        lifespan_days: butterfly_species.lifespan_days,
        host_plant: butterfly_species.host_plant,
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
