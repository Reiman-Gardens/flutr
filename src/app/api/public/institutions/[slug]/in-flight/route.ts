import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { internalError, invalidRequest, notFound, ok } from "@/lib/api-response";
import { institutionSlugParamsSchema, publicEmptyQuerySchema } from "@/lib/validation/public";
import { getInstitutionInFlightBySlug } from "@/lib/queries/inflight";

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

    const inFlight = await getInstitutionInFlightBySlug(slug);
    if (!inFlight) {
      return notFound("Institution not found");
    }

    return ok({ inFlight });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions/[slug]/in-flight error:", error);
    return internalError();
  }
}
