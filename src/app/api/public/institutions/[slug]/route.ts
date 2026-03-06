import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";
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

    const [institution] = await db
      .select({
        id: institutions.id,
        name: institutions.name,
        slug: institutions.slug,
        street_address: institutions.street_address,
        extended_address: institutions.extended_address,
        city: institutions.city,
        state_province: institutions.state_province,
        postal_code: institutions.postal_code,
        country: institutions.country,
        email_address: institutions.email_address,
        phone_number: institutions.phone_number,
        website_url: institutions.website_url,
        logo_url: institutions.logo_url,
        facility_image_url: institutions.facility_image_url,
        social_links: institutions.social_links,
      })
      .from(institutions)
      .where(and(eq(institutions.slug, slug), eq(institutions.stats_active, true)))
      .limit(1);

    if (!institution) {
      return notFound("Institution not found");
    }

    return ok({ institution });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions/[slug] error:", error);
    return internalError();
  }
}
