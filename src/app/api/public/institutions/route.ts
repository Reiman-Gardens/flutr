import { NextRequest } from "next/server";
import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";
import { publicInstitutionsQuerySchema } from "@/lib/validation/public";
import { ok, internalError, invalidRequest } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request?.nextUrl?.searchParams;
    const query = searchParams ? Object.fromEntries(searchParams) : {};

    const parsed = publicInstitutionsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return invalidRequest("Invalid query parameters", parsed.error.issues);
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      db
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
        .where(eq(institutions.stats_active, true))
        .orderBy(institutions.name)
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(institutions).where(eq(institutions.stats_active, true)),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return ok({
      institutions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error("Unexpected GET /public/institutions error:", error);
    return internalError();
  }
}
