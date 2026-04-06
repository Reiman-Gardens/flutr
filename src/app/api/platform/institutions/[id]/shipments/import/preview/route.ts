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
import { getPlatformShipmentImportPreview } from "@/lib/services/shipment-import";
import { platformInstitutionIdParamsSchema } from "@/lib/validation/institution";
import { shipmentImportPreviewRequestSchema } from "@/lib/validation/shipment-import";
import { requireValidBody } from "@/lib/validation/request";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const paramResult = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const bodyResult = await requireValidBody(request, shipmentImportPreviewRequestSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const preview = await getPlatformShipmentImportPreview({
      institutionId: paramResult.data.id,
      ...bodyResult.data,
    });

    return ok(preview);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    logger.error(
      "Unexpected POST /platform/institutions/[id]/shipments/import/preview error:",
      error,
    );
    return internalError();
  }
}
