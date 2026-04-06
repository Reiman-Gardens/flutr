import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { handleTenantError } from "@/lib/tenant";
import { commitTenantShipmentImport } from "@/lib/services/tenant-shipment-import";
import { shipmentImportCommitRequestSchema } from "@/lib/validation/shipment-import";
import { requireValidBody } from "@/lib/validation/request";

export async function POST(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const bodyResult = await requireValidBody(request, shipmentImportCommitRequestSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const summary = await commitTenantShipmentImport({
      slug,
      ...bodyResult.data,
    });

    return ok(summary);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "PREVIEW_HASH_MISMATCH") {
        return invalidRequest("Preview hash mismatch. Re-run parse preview before commit.");
      }
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /tenant/shipments/import/commit error:", error);
    return internalError();
  }
}
