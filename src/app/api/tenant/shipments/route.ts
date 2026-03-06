import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { requireUser, canReadShipment, canWriteShipment } from "@/lib/authz";
import { forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { listShipmentsQuerySchema, createShipmentBodySchema } from "@/lib/validation/shipments";
import { requireValidQuery } from "@/lib/validation/query";

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

    const queryResult = requireValidQuery(
      listShipmentsQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if ("error" in queryResult) return queryResult.error;
    const queryData = queryResult.data;

    return ok({ shipments: [], query: queryData });
  } catch (error) {
    logger.error("Unexpected GET /tenant/shipments error:", error);
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

    const bodyResult = await requireValidBody(request, createShipmentBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ shipment: null, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /tenant/shipments error:", error);
    return internalError();
  }
}
