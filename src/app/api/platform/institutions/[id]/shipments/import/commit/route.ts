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
import { commitPlatformShipmentImport } from "@/lib/services/shipment-import";
import { platformInstitutionIdParamsSchema } from "@/lib/validation/institution";
import { shipmentImportCommitRequestSchema } from "@/lib/validation/shipment-import";
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

    const bodyResult = await requireValidBody(request, shipmentImportCommitRequestSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const summary = await commitPlatformShipmentImport({
      institutionId: paramResult.data.id,
      ...bodyResult.data,
    });

    return ok(summary);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
      if (error.message === "PREVIEW_HASH_MISMATCH") {
        return invalidRequest("Preview hash mismatch. Re-run parse preview before commit.");
      }
    }

    logger.error(
      "Unexpected POST /platform/institutions/[id]/shipments/import/commit error:",
      error,
    );
    return internalError();
  }
}
