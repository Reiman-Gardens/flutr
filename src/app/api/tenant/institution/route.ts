import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  forbidden,
  internalError,
  notFound,
  ok,
  unauthorized,
  invalidRequest,
} from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { tenantUpdateInstitutionSchema } from "@/lib/validation/institution";
import { handleTenantError } from "@/lib/tenant";

import {
  getTenantInstitutionService,
  updateTenantInstitutionService,
} from "@/lib/services/tenant-institution";

/**
 * GET /api/tenant/institution
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const institution = await getTenantInstitutionService(slug);

    return ok({ institution });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/institution error:", error);
    return internalError();
  }
}

/**
 * PATCH /api/tenant/institution
 */
export async function PATCH(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const bodyResult = await requireValidBody(request, tenantUpdateInstitutionSchema);

    if ("error" in bodyResult) return bodyResult.error;

    const updated = await updateTenantInstitutionService(slug, bodyResult.data);

    return ok({ institution: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /tenant/institution error:", error);
    return internalError();
  }
}
