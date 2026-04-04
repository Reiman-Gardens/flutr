import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { forbidden, internalError, invalidRequest, unauthorized } from "@/lib/api-response";
import { handleTenantError } from "@/lib/tenant";
import { exportTenantShipmentWorkbook } from "@/lib/services/tenant-shipment-import";
import { shipmentExportQuerySchema } from "@/lib/validation/platform-shipment-import";
import { requireValidQuery } from "@/lib/validation/query";

export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) {
      return invalidRequest("Missing tenant slug");
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

    const workbook = await exportTenantShipmentWorkbook({ slug });
    const workbookArrayBuffer = Uint8Array.from(workbook).buffer;
    const workbookBlob = new Blob([workbookArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return new NextResponse(workbookBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${slug}-shipments.xlsx\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/shipments/export error:", error);
    return internalError();
  }
}
