import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canCreateInstitution, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import {
  platformInstitutionIdParamsSchema,
  platformUpdateInstitutionSchema,
} from "@/lib/validation/institution";
import { requireValidBody } from "@/lib/validation/request";

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

    if (!canCreateInstitution(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ institution: null, params });
  } catch (error) {
    logger.error("Unexpected GET /platform/institutions/[id] error:", error);
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

    if (!canCreateInstitution(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    const bodyResult = await requireValidBody(request, platformUpdateInstitutionSchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ institution: null, params, body: validBody });
  } catch (error) {
    logger.error("Unexpected PATCH /platform/institutions/[id] error:", error);
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

    if (!canCreateInstitution(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ deleted: false, params });
  } catch (error) {
    logger.error("Unexpected DELETE /platform/institutions/[id] error:", error);
    return internalError();
  }
}
