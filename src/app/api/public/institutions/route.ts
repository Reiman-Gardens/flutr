import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";
import { publicEmptyQuerySchema } from "@/lib/validation/public";
import { ok, internalError, invalidRequest } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request?.nextUrl?.searchParams;
    const query = searchParams ? Object.fromEntries(searchParams) : {};

    const parsed = publicEmptyQuerySchema.safeParse(query);
    if (!parsed.success) {
      return invalidRequest("Invalid query parameters", parsed.error.issues);
    }

    const rows = await db
      .select({
        id: institutions.id,
        slug: institutions.slug,
        name: institutions.name,
        city: institutions.city,
        state_province: institutions.state_province,
        country: institutions.country,
        website_url: institutions.website_url,
        facility_image_url: institutions.facility_image_url,
        logo_url: institutions.logo_url,
        stats_active: institutions.stats_active,
      })
      .from(institutions)
      .where(eq(institutions.stats_active, true));

    return ok({ institutions: rows });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions error:", error);
    return internalError();
  }
}
