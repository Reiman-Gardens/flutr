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
import { requireValidBody } from "@/lib/validation/request";
import { speciesIdParamsSchema, updateSpeciesOverrideBodySchema } from "@/lib/validation/species";

import { updateTenantSpeciesOverride } from "@/lib/services/tenant-species";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) return invalidRequest("Missing tenant slug");

    const routeParams = await context.params;
    const paramResult = speciesIdParamsSchema.safeParse(routeParams);

    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const bodyResult = await requireValidBody(request, updateSpeciesOverrideBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const override = await updateTenantSpeciesOverride({
      slug,
      speciesId: paramResult.data.id,
      ...bodyResult.data,
    });

    return ok({ override });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Species not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /tenant/species/[id] error:", error);
    return internalError();
  }
}
