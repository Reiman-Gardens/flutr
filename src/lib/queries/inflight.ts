import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  institutions,
  in_flight,
  release_events,
  shipment_items,
  butterfly_species,
  butterfly_species_institution,
} from "@/lib/schema";

export interface InstitutionInFlightRow {
  scientific_name: string;
  common_name: string;
  image_url: string | null;
  quantity: number;
}

export interface InFlightBySpeciesRow {
  butterfly_species_id: number;
  quantity: number;
}

export interface CurrentInFlightSummary {
  totalButterflies: number;
  totalSpecies: number;
}

function lifespanDaysExpr() {
  return sql<number>`coalesce(${butterfly_species_institution.lifespan_override}, ${butterfly_species.lifespan_days})`;
}

function aliveCondition() {
  return sql`${release_events.release_date} + (${lifespanDaysExpr()} * interval '1 day') > now()`;
}

/**
 * Current in-flight quantities grouped by species for an institution.
 * Uses release date plus effective lifespan to keep only butterflies
 * still expected to be alive in the exhibit.
 */
export function currentInFlightBySpeciesSubquery(institutionId: number) {
  return db
    .select({
      butterfly_species_id: shipment_items.butterfly_species_id,
      quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("quantity"),
    })
    .from(in_flight)
    .innerJoin(
      release_events,
      and(
        eq(in_flight.institution_id, release_events.institution_id),
        eq(in_flight.release_event_id, release_events.id),
      ),
    )
    .innerJoin(
      shipment_items,
      and(
        eq(in_flight.institution_id, shipment_items.institution_id),
        eq(in_flight.shipment_item_id, shipment_items.id),
      ),
    )
    .innerJoin(butterfly_species, eq(shipment_items.butterfly_species_id, butterfly_species.id))
    .leftJoin(
      butterfly_species_institution,
      and(
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
        eq(butterfly_species_institution.institution_id, institutionId),
      ),
    )
    .where(and(eq(in_flight.institution_id, institutionId), aliveCondition()))
    .groupBy(shipment_items.butterfly_species_id)
    .as("current_in_flight_by_species");
}

/**
 * Live exhibit summary totals for an institution.
 */
export async function getCurrentInFlightSummary(
  institutionId: number,
): Promise<CurrentInFlightSummary> {
  const currentInFlight = currentInFlightBySpeciesSubquery(institutionId);

  const [row] = await db
    .select({
      totalButterflies: sql<number>`coalesce(sum(${currentInFlight.quantity}), 0)::int`.as(
        "totalButterflies",
      ),
      totalSpecies: sql<number>`count(*)::int`.as("totalSpecies"),
    })
    .from(currentInFlight);

  return {
    totalButterflies: Number(row?.totalButterflies ?? 0),
    totalSpecies: Number(row?.totalSpecies ?? 0),
  };
}

/**
 * Historical released quantities grouped by species for an institution.
 * This intentionally does not apply release-date or lifespan filtering.
 */
export function historicalReleasedBySpeciesSubquery(institutionId: number) {
  return db
    .select({
      butterfly_species_id: shipment_items.butterfly_species_id,
      quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("quantity"),
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
    .as("historical_released_by_species");
}

/**
 * Public in-flight aggregation for an institution slug.
 * Returns null when the institution does not exist or is not publicly active.
 */
export async function getInstitutionInFlightBySlug(slug: string) {
  const [institution] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
    .limit(1);

  if (!institution) {
    return null;
  }

  const currentInFlight = currentInFlightBySpeciesSubquery(institution.id);

  const rows = await db
    .select({
      scientific_name: butterfly_species.scientific_name,
      common_name:
        sql<string>`coalesce(${butterfly_species_institution.common_name_override}, ${butterfly_species.common_name})`.as(
          "common_name",
        ),
      image_url: sql<
        string | null
      >`coalesce(${butterfly_species.img_wings_open}, ${butterfly_species.img_wings_closed})`.as(
        "image_url",
      ),
      quantity: sql<number>`${currentInFlight.quantity}`.as("quantity"),
    })
    .from(currentInFlight)
    .innerJoin(butterfly_species, eq(currentInFlight.butterfly_species_id, butterfly_species.id))
    .leftJoin(
      butterfly_species_institution,
      and(
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
        eq(butterfly_species_institution.institution_id, institution.id),
      ),
    )
    .groupBy(
      butterfly_species.scientific_name,
      butterfly_species.common_name,
      butterfly_species_institution.common_name_override,
      butterfly_species.img_wings_open,
      butterfly_species.img_wings_closed,
      currentInFlight.quantity,
    )
    .orderBy(asc(butterfly_species.scientific_name));

  return rows;
}
