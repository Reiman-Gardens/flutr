import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { requireUser, canReadShipment, canWriteShipment } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { listShipmentsQuerySchema, createShipmentBodySchema } from "@/lib/validation/shipments";

export async function GET(request: NextRequest) {
  try {
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

    const url = new URL(request.url);
    const query = listShipmentsQuerySchema.parse({
      institutionId: url.searchParams.get("institutionId") ?? undefined,
    });

    return ok({ shipments: [], query });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
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

    if (!canWriteShipment(user)) {
      return forbidden();
    }

    const body = createShipmentBodySchema.parse(await request.json());

    return ok({ shipment: null, body }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
