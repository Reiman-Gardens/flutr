import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageGlobalButterflies, requireUser } from "@/lib/authz";
import { conflict, forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { handleTenantError } from "@/lib/tenant";
import { createSpecies, listSpeciesGlobal } from "@/lib/queries/species";
import { requireValidBody } from "@/lib/validation/request";
import { createSpeciesBodySchema } from "@/lib/validation/species";

export async function GET(request: NextRequest) {
  try {
    void request;

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

    const species = await listSpeciesGlobal();

    return ok({ species });
  } catch (error) {
    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /platform/species error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
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

    const bodyResult = await requireValidBody(request, createSpeciesBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const species = await createSpecies(bodyResult.data);

    return ok({ species }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return conflict("Species scientific name already exists");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /platform/species error:", error);
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
