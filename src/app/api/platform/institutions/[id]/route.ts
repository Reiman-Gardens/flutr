import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  conflict,
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import {
  platformInstitutionIdParamsSchema,
  platformUpdateInstitutionSchema,
} from "@/lib/validation/institution";
import { requireValidBody } from "@/lib/validation/request";
import { handleTenantError } from "@/lib/tenant";

import {
  getPlatformInstitutionById,
  updatePlatformInstitution,
  deletePlatformInstitution,
} from "@/lib/services/platform-institutions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const institution = await getPlatformInstitutionById(result.data.id);
    if (!institution) {
      return notFound("Institution not found");
    }

    return ok({ institution });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /platform/institutions/[id] error:", error);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const bodyResult = await requireValidBody(request, platformUpdateInstitutionSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const updated = await updatePlatformInstitution(result.data.id, bodyResult.data);

    return ok({ institution: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
      if (error.message === "CONFLICT") return conflict("Slug already in use");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /platform/institutions/[id] error:", error);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    await deletePlatformInstitution(result.data.id);

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected DELETE /platform/institutions/[id] error:", error);
    return internalError();
  }
}
