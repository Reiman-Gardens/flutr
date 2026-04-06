import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { platformInstitutionIdParamsSchema } from "@/lib/validation/institution";
import { shipmentDeleteBodySchema } from "@/lib/validation/shipment-import";
import { requireValidBody } from "@/lib/validation/request";
import {
  deletePlatformShipments,
  getPlatformShipmentSummary,
} from "@/lib/services/platform-shipments";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const data = await getPlatformShipmentSummary({ institutionId: result.data.id });
    return ok(data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    logger.error("Unexpected GET /platform/institutions/[id]/shipments error:", error);
    return internalError();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const paramResult = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const bodyResult = await requireValidBody(request, shipmentDeleteBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const result = await deletePlatformShipments({
      institutionId: paramResult.data.id,
      options: bodyResult.data,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    logger.error("Unexpected DELETE /platform/institutions/[id]/shipments error:", error);
    return internalError();
  }
}
