import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  butterfly_species,
  butterfly_species_institution,
  in_flight,
  institutions,
  release_events,
  shipment_items,
} from "@/lib/schema";
import { getInstitutionBySlugSchema } from "@/lib/validation/institution";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const parsed = getInstitutionBySlugSchema.safeParse({ slug: resolvedParams.slug });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    const [institution] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.slug, parsed.data.slug))
      .limit(1);

    if (!institution) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        common_name_override: butterfly_species_institution.common_name_override,
        img_wings_open: butterfly_species.img_wings_open,
        img_wings_closed: butterfly_species.img_wings_closed,
        quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)`.as("quantity"),
      })
      .from(in_flight)
      .innerJoin(
        release_events,
        and(
          eq(in_flight.release_event_id, release_events.id),
          eq(in_flight.institution_id, release_events.institution_id),
        ),
      )
      .innerJoin(
        shipment_items,
        and(
          eq(in_flight.shipment_item_id, shipment_items.id),
          eq(in_flight.institution_id, shipment_items.institution_id),
        ),
      )
      .innerJoin(butterfly_species, eq(shipment_items.butterfly_species_id, butterfly_species.id))
      .leftJoin(
        butterfly_species_institution,
        and(
          eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
          eq(butterfly_species_institution.institution_id, institution.id),
        ),
      )
      .where(
        and(
          eq(in_flight.institution_id, institution.id),
          sql`now() < (${release_events.release_date} + (coalesce(${butterfly_species_institution.lifespan_override}, ${butterfly_species.lifespan_days}) * interval '1 day'))`,
        ),
      )
      .groupBy(
        butterfly_species.id,
        butterfly_species.scientific_name,
        butterfly_species.common_name,
        butterfly_species_institution.common_name_override,
        butterfly_species.img_wings_open,
        butterfly_species.img_wings_closed,
      );

    const result = rows.map((species) => ({
      scientific_name: species.scientific_name,
      common_name: species.common_name_override ?? species.common_name,
      image_url: species.img_wings_open ?? species.img_wings_closed,
      quantity: Number(species.quantity ?? 0),
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to load institution in-flight species", error);
    return NextResponse.json({ error: "Unable to load in-flight" }, { status: 500 });
  }
}
