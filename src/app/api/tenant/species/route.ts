import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { handleTenantError } from "@/lib/tenant";

import { getTenantSpecies } from "@/lib/services/tenant-species";

export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) return invalidRequest("Missing tenant slug");

    const species = await getTenantSpecies({ slug });

    return ok({ species });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/species error:", error);
    return internalError();
  }
}
