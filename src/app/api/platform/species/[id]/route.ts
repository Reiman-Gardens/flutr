import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageGlobalButterflies, requireUser } from "@/lib/authz";
import {
  conflict,
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { speciesIdParamsSchema, updateSpeciesBodySchema } from "@/lib/validation/species";
import { getSpeciesById, updateSpecies } from "@/lib/queries/species";
import { handleTenantError } from "@/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canManageGlobalButterflies(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const paramResult = speciesIdParamsSchema.safeParse(routeParams);

    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const bodyResult = await requireValidBody(request, updateSpeciesBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const speciesId = paramResult.data.id;

    const existingSpecies = await getSpeciesById(speciesId);
    if (!existingSpecies) {
      return notFound("Species not found");
    }

    const species = await updateSpecies(speciesId, bodyResult.data);
    if (!species) {
      return notFound("Species not found");
    }

    return ok({ species });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return conflict("Species scientific name already exists");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /platform/species/[id] error:", error);
    return internalError();
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}
