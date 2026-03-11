import { NextRequest } from "next/server";
import { eq, and, count } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  institutions,
  in_flight,
  release_events,
  shipment_items,
  butterfly_species,
} from "@/lib/schema";
import { internalError, invalidRequest, notFound, ok } from "@/lib/api-response";
import { institutionSlugParamsSchema } from "@/lib/validation/public";
import { paginatedQuerySchema } from "@/lib/validation/pagination";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = request?.nextUrl?.searchParams;
    const query = searchParams ? Object.fromEntries(searchParams) : {};

    const parsedQuery = paginatedQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return invalidRequest("Invalid query parameters", parsedQuery.error.issues);
    }

    const routeParams = await context.params;

    const parsedParams = institutionSlugParamsSchema.safeParse(routeParams);
    if (!parsedParams.success) {
      return invalidRequest("Invalid route parameters", parsedParams.error.issues);
    }

    const { slug } = parsedParams.data;
    const { page, limit } = parsedQuery.data;
    const offset = (page - 1) * limit;

    const institutionRows = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
      .limit(1);

    if (!institutionRows.length) {
      return notFound("Institution not found");
    }

    const institutionId = institutionRows[0].id;

    const baseCondition = eq(in_flight.institution_id, institutionId);

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: in_flight.id,
          quantity: in_flight.quantity,
          release_date: release_events.release_date,
          scientific_name: butterfly_species.scientific_name,
          common_name: butterfly_species.common_name,
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
        .where(baseCondition)
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(in_flight).where(baseCondition),
    ]);

    return ok({
      inFlight: rows,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.total ?? 0,
      },
    });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions/[slug]/in-flight error:", error);
    return internalError();
  }
}
