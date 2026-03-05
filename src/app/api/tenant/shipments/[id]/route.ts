import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canReadShipment, canWriteShipment, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validation/shared";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { shipmentIdParamsSchema, updateShipmentBodySchema } from "@/lib/validation/shipments";

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

    if (!canReadShipment(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const paramResult = shipmentIdParamsSchema.safeParse(routeParams);

    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const params = paramResult.data;

    return ok({ shipment: null, params });
  } catch (error) {
    logger.error("Unexpected GET /tenant/shipments/[id] error:", error);
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

    if (!canWriteShipment(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const paramResult = shipmentIdParamsSchema.safeParse(routeParams);

    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const params = paramResult.data;
    const bodyResult = await parseJsonBody(request, updateShipmentBodySchema);

    if (!bodyResult.success && bodyResult.type === "invalid_json") {
      return invalidRequest("Malformed JSON body");
    }

    if (!bodyResult.success && bodyResult.type === "validation_error") {
      return invalidRequest("Invalid request body", bodyResult.issues);
    }

    const validBody = bodyResult.data;

    return ok({ shipment: null, params, body: validBody });
  } catch (error) {
    logger.error("Unexpected PATCH /tenant/shipments/[id] error:", error);
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

    if (!canWriteShipment(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const paramResult = shipmentIdParamsSchema.safeParse(routeParams);

    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const params = paramResult.data;

    return ok({ deleted: false, params });
  } catch (error) {
    logger.error("Unexpected DELETE /tenant/shipments/[id] error:", error);
    return internalError();
  }
}
