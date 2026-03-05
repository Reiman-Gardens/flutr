import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageUsers, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { updateUserBodySchema, userIdParamsSchema } from "@/lib/validation/users";

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

    if (!canManageUsers(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = userIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ user: null, params });
  } catch (error) {
    logger.error("Unexpected GET /tenant/users/[id] error:", error);
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

    if (!canManageUsers(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = userIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    const bodyResult = await requireValidBody(request, updateUserBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ user: null, params, body: validBody });
  } catch (error) {
    logger.error("Unexpected PATCH /tenant/users/[id] error:", error);
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

    if (!canManageUsers(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = userIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ deleted: false, params });
  } catch (error) {
    logger.error("Unexpected DELETE /tenant/users/[id] error:", error);
    return internalError();
  }
}
