import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  unauthorized,
} from "@/lib/api-response";
import { exportPlatformShipmentWorkbook } from "@/lib/services/platform-shipment-import";
import { platformInstitutionIdParamsSchema } from "@/lib/validation/institution";
import { shipmentExportQuerySchema } from "@/lib/validation/platform-shipment-import";
import { requireValidQuery } from "@/lib/validation/query";

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

    const queryResult = requireValidQuery(
      shipmentExportQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if ("error" in queryResult) return queryResult.error;

    const format = queryResult.data.format ?? "xlsx";
    if (format !== "xlsx") {
      return invalidRequest("Unsupported export format");
    }

    const workbook = await exportPlatformShipmentWorkbook({ institutionId: paramResult.data.id });
    const workbookArrayBuffer = Uint8Array.from(workbook).buffer;
    const workbookBlob = new Blob([workbookArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return new NextResponse(workbookBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"institution-${paramResult.data.id}-shipments.xlsx\"`,
        "Cache-Control": "no-store",
      },
    });
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
