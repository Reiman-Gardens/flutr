import { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species } from "@/lib/schema";
import { internalError, invalidRequest, ok } from "@/lib/api-response";
import { publicInstitutionQuerySchema } from "@/lib/validation/public";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request?.nextUrl?.searchParams;
    const query = searchParams ? Object.fromEntries(searchParams) : {};

    const parsed = publicInstitutionQuerySchema.safeParse(query);
    if (!parsed.success) {
      return invalidRequest("Invalid query parameters", parsed.error.issues);
    }

    const rows = await db.select().from(butterfly_species);

    return ok({ species: rows });
  } catch (error) {
    logger.error("Unexpected GET /public/species error:", error);
    return internalError();
  }
}
