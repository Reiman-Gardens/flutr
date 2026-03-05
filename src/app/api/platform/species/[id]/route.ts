import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageGlobalButterflies, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { speciesIdParamsSchema, updateSpeciesBodySchema } from "@/lib/validation/species";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    void _request;
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
    const result = speciesIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ species: null, params });
  } catch (error) {
    logger.error("Unexpected GET /platform/species/[id] error:", error);
    return internalError();
  }
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
    const result = speciesIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    const bodyResult = await requireValidBody(request, updateSpeciesBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ species: null, params, body: validBody });
  } catch (error) {
    logger.error("Unexpected PATCH /platform/species/[id] error:", error);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    void _request;
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
    const result = speciesIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ deleted: false, params });
  } catch (error) {
    logger.error("Unexpected DELETE /platform/species/[id] error:", error);
    return internalError();
  }
}
