import { NextRequest } from "next/server";
import { count } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species } from "@/lib/schema";
import { internalError, invalidRequest, ok } from "@/lib/api-response";
import { paginatedQuerySchema } from "@/lib/validation/pagination";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request?.nextUrl?.searchParams;
    const query = searchParams ? Object.fromEntries(searchParams) : {};

    const parsed = paginatedQuerySchema.safeParse(query);
    if (!parsed.success) {
      return invalidRequest("Invalid query parameters", parsed.error.issues);
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: butterfly_species.id,
          scientific_name: butterfly_species.scientific_name,
          common_name: butterfly_species.common_name,
          family: butterfly_species.family,
          sub_family: butterfly_species.sub_family,
          lifespan_days: butterfly_species.lifespan_days,
          range: butterfly_species.range,
          img_wings_open: butterfly_species.img_wings_open,
          img_wings_closed: butterfly_species.img_wings_closed,
        })
        .from(butterfly_species)
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(butterfly_species),
    ]);

    return ok({
      species: rows,
      pagination: { page, limit, total: totalResult[0]?.total ?? 0 },
    });
  } catch (error) {
    logger.error("Unexpected GET /public/species error:", error);
    return internalError();
  }
}
