import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createReleaseBodySchema } from "@/lib/validation/releases";
import { shipmentIdParamsSchema } from "@/lib/validation/shipments";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    const result = shipmentIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }
    const params = result.data;
    const bodyResult = await requireValidBody(request, createReleaseBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ release: null, params, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /tenant/shipments/[id]/releases error:", error);
    return internalError();
  }
}
