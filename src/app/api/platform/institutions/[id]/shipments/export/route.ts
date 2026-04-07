import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  unauthorized,
} from "@/lib/api-response";
import {
  buildShipmentExportFilename,
  buildShipmentWorkbookResponse,
  parseShipmentExportQuery,
} from "@/lib/shipment-export";
import { exportPlatformShipmentWorkbook } from "@/lib/services/shipment-import";
import { platformInstitutionIdParamsSchema } from "@/lib/validation/institution";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const paramResult = platformInstitutionIdParamsSchema.safeParse(routeParams);
    if (!paramResult.success) {
      return invalidRequest("Invalid request parameters", paramResult.error.issues);
    }

    const query = parseShipmentExportQuery(request);
    if ("error" in query) return query.error;
    const { from, to, range } = query.data;
    const institutionId = paramResult.data.id;

    const workbook = await exportPlatformShipmentWorkbook({ institutionId, range });
    const filename = buildShipmentExportFilename(
      `institution-${institutionId}-shipments`,
      from,
      to,
    );
    return buildShipmentWorkbookResponse(workbook, filename);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    logger.error("Unexpected GET /platform/institutions/[id]/shipments/export error:", error);
    return internalError();
  }
}
