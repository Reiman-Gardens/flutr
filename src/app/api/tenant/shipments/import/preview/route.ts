import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { handleTenantError } from "@/lib/tenant";
import { getTenantShipmentImportPreview } from "@/lib/services/tenant-shipment-import";
import { shipmentImportPreviewRequestSchema } from "@/lib/validation/platform-shipment-import";
import { requireValidBody } from "@/lib/validation/request";

export async function POST(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const bodyResult = await requireValidBody(request, shipmentImportPreviewRequestSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const preview = await getTenantShipmentImportPreview({
      slug,
      ...bodyResult.data,
    });

    return ok(preview);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /tenant/shipments/import/preview error:", error);
    return internalError();
  }
}
