import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { idParamSchema } from "@/lib/validation/params";
import { requireValidBody } from "@/lib/validation/request";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// TODO: Flesh out the body schema once we know what fields we want to allow updating for in-flight releases
const updateInFlightBodySchema = z.object({}).strict();

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canCreateRelease(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = idParamSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    const bodyResult = await requireValidBody(request, updateInFlightBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ inFlight: null, params, body: validBody });
  } catch (error) {
    logger.error("Unexpected PATCH /tenant/in-flight/[id] error:", error);
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

    if (!canCreateRelease(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const result = idParamSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    return ok({ deleted: false, params });
  } catch (error) {
    logger.error("Unexpected DELETE /tenant/in-flight/[id] error:", error);
    return internalError();
  }
}
