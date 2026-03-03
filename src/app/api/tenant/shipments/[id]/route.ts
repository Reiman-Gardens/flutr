import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { canReadShipment, canWriteShipment, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { shipmentIdParamsSchema } from "@/lib/validation/shipments";

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
    const params = shipmentIdParamsSchema.parse(routeParams);

    return ok({ shipment: null, params });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
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
    const params = shipmentIdParamsSchema.parse(routeParams);
    const body = await request.json();

    return ok({ shipment: null, params, body });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
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
    const params = shipmentIdParamsSchema.parse(routeParams);

    return ok({ deleted: false, params });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
