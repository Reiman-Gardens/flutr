import { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species } from "@/lib/schema";
import { internalError, invalidRequest, ok } from "@/lib/api-response";
import { publicEmptyQuerySchema } from "@/lib/validation/public";

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
      .from(butterfly_species);

    return ok({ species: rows });
  } catch (error) {
    logger.error("Unexpected GET /public/species error:", error);
    return internalError();
  }
}
