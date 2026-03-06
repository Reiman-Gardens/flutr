import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions, butterfly_species_institution, butterfly_species } from "@/lib/schema";
import { internalError, invalidRequest, notFound, ok } from "@/lib/api-response";
import { institutionSlugParamsSchema, publicEmptyQuerySchema } from "@/lib/validation/public";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = request?.nextUrl?.searchParams;
    const query = searchParams ? Object.fromEntries(searchParams) : {};

    const parsedQuery = publicEmptyQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return invalidRequest("Invalid query parameters", parsedQuery.error.issues);
    }

    const routeParams = await context.params;

    const parsedParams = institutionSlugParamsSchema.safeParse(routeParams);
    if (!parsedParams.success) {
      return invalidRequest("Invalid route parameters", parsedParams.error.issues);
    }

    const { slug } = parsedParams.data;

    const institutionRows = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
      .limit(1);

    if (!institutionRows.length) {
      return notFound("Institution not found");
    }

    const institutionId = institutionRows[0].id;

    const rows = await db
      .select({
        speciesId: butterfly_species.id,
        scientific_name: butterfly_species.scientific_name,
        common_name: butterfly_species.common_name,
        common_name_override: butterfly_species_institution.common_name_override,
        lifespan_days: butterfly_species.lifespan_days,
        lifespan_override: butterfly_species_institution.lifespan_override,
      })
      .from(butterfly_species_institution)
      .innerJoin(
        butterfly_species,
        eq(butterfly_species_institution.butterfly_species_id, butterfly_species.id),
      )
      .where(eq(butterfly_species_institution.institution_id, institutionId));

    return ok({ species: rows });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions/[slug]/species error:", error);
    return internalError();
  }
}
