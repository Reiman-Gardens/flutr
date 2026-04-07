import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { forbidden, internalError, invalidRequest, unauthorized } from "@/lib/api-response";
import {
  buildShipmentExportFilename,
  buildShipmentWorkbookResponse,
  parseShipmentExportQuery,
} from "@/lib/shipment-export";
import { handleTenantError } from "@/lib/tenant";
import { exportTenantShipmentWorkbook } from "@/lib/services/tenant-shipment-import";

export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const query = parseShipmentExportQuery(request);
    if ("error" in query) return query.error;
    const { from, to, range } = query.data;

    const workbook = await exportTenantShipmentWorkbook({ slug, range });
    const filename = buildShipmentExportFilename(`${slug}-shipments`, from, to);
    return buildShipmentWorkbookResponse(workbook, filename);
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
