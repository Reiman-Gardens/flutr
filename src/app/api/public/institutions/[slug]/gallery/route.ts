import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";
import { internalError, invalidRequest, notFound, ok } from "@/lib/api-response";
import { institutionSlugParamsSchema, publicEmptyQuerySchema } from "@/lib/validation/public";
import { getGalleryDetailData } from "@/lib/queries/gallery";

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

    const gallery = await getGalleryDetailData(institutionRows[0].id);

    return ok({ gallery });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions/[slug]/gallery error:", error);
    return internalError();
  }
}
