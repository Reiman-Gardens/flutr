import { cache } from "react";
import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  in_flight,
  shipment_items,
  butterfly_species,
  butterfly_species_institution,
} from "@/lib/schema";

export interface StatsSpeciesRow {
  scientific_name: string;
  common_name: string;
  family: string;
  sub_family: string;
  range: string[];
  lifespan_days: number;
  img_wings_open: string | null;
  quantity: number;
}

export interface SpeciesBreakdownItem {
  name: string;
  quantity: number;
  scientific_name: string;
  family: string;
  range: string[];
  img_wings_open: string | null;
}

export interface StatsPageData {
  totalButterflies: number;
  totalSpecies: number;
  uniqueFamilies: number;
  averageLifespan: number;
  speciesBreakdown: SpeciesBreakdownItem[];
  familyDistribution: { name: string; value: number }[];
  regionDistribution: { name: string; count: number }[];
}

/**
 * Fetches in-flight species data with taxonomy and range info for the stats page.
 */
export const getStatsData = cache(async (institutionId: number) => {
  const lifespanDaysExpr = sql<number>`coalesce(${butterfly_species_institution.lifespan_override}, ${butterfly_species.lifespan_days})`;

  const rows = await db
    .select({
      scientific_name: butterfly_species.scientific_name,
      common_name:
        sql<string>`coalesce(${butterfly_species_institution.common_name_override}, ${butterfly_species.common_name})`.as(
          "common_name",
        ),
      family: butterfly_species.family,
      sub_family: butterfly_species.sub_family,
      range: butterfly_species.range,
      img_wings_open: butterfly_species.img_wings_open,
      lifespan_days: sql<number>`${lifespanDaysExpr}`.as("lifespan_days"),
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
    .innerJoin(butterfly_species, eq(shipment_items.butterfly_species_id, butterfly_species.id))
    .leftJoin(
      butterfly_species_institution,
      and(
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
        eq(butterfly_species_institution.institution_id, institutionId),
      ),
    )
    .where(eq(in_flight.institution_id, institutionId))
    .groupBy(
      butterfly_species.scientific_name,
      butterfly_species.common_name,
      butterfly_species_institution.common_name_override,
      butterfly_species.family,
      butterfly_species.sub_family,
      butterfly_species.range,
      butterfly_species.img_wings_open,
      butterfly_species.lifespan_days,
      butterfly_species_institution.lifespan_override,
    )
    .orderBy(asc(butterfly_species.scientific_name));

  return rows as StatsSpeciesRow[];
});

const MAX_FAMILIES_SHOWN = 6;

/**
 * Transforms raw stats rows into chart-ready aggregations.
 */
export function transformStatsData(rows: StatsSpeciesRow[]): StatsPageData {
  const totalButterflies = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
  const totalSpecies = rows.length;
  const uniqueFamilies = new Set(rows.map((r) => r.family)).size;

  const averageLifespan =
    totalButterflies > 0
      ? Math.round(
          rows.reduce((sum, r) => sum + Number(r.quantity) * Number(r.lifespan_days), 0) /
            totalButterflies,
        )
      : 0;

  // Species breakdown: all species sorted by quantity descending
  const speciesBreakdown: SpeciesBreakdownItem[] = [...rows]
    .sort((a, b) => b.quantity - a.quantity)
    .map((r) => ({
      name: r.common_name,
      quantity: Number(r.quantity),
      scientific_name: r.scientific_name,
      family: r.family,
      range: r.range,
      img_wings_open: r.img_wings_open,
    }));

  // Family distribution: group small families into "Other"
  const familyMap = new Map<string, number>();
  for (const r of rows) {
    familyMap.set(r.family, (familyMap.get(r.family) ?? 0) + Number(r.quantity));
  }
  const familySorted = [...familyMap.entries()].sort((a, b) => b[1] - a[1]);
  const familyDistribution: { name: string; value: number }[] = [];
  let otherFamilyValue = 0;

  for (let i = 0; i < familySorted.length; i++) {
    if (i < MAX_FAMILIES_SHOWN) {
      familyDistribution.push({ name: familySorted[i][0], value: familySorted[i][1] });
    } else {
      otherFamilyValue += familySorted[i][1];
    }
  }
  if (otherFamilyValue > 0) {
    familyDistribution.push({ name: "Other", value: otherFamilyValue });
  }

  // Region distribution: species count per region, normalized
  const regionMap = new Map<string, number>();
  for (const r of rows) {
    for (const region of r.range) {
      const normalized = region.trim();
      if (normalized) {
        regionMap.set(normalized, (regionMap.get(normalized) ?? 0) + 1);
      }
    }
  }
  const regionDistribution = [...regionMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalButterflies,
    totalSpecies,
    uniqueFamilies,
    averageLifespan,
    speciesBreakdown,
    familyDistribution,
    regionDistribution,
  };
}
