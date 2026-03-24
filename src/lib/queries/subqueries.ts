import { eq, and, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { shipment_items, in_flight } from "@/lib/schema";

/**
 * Pre-aggregated in-flight counts per species for a given institution.
 * Single scan of in_flight + shipment_items instead of N correlated subqueries.
 */
export function inFlightCountSubquery(institutionId: number) {
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
