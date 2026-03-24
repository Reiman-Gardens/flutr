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
import { requireValidBody } from "@/lib/validation/request";
import { requireValidQuery } from "@/lib/validation/query";
import { listShipmentsQuerySchema, createShipmentBodySchema } from "@/lib/validation/shipments";
import { handleTenantError } from "@/lib/tenant";

import { getTenantShipments, createTenantShipment } from "@/lib/services/tenant-shipments";

export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const queryResult = requireValidQuery(
      listShipmentsQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if ("error" in queryResult) return queryResult.error;

    const { page, limit } = queryResult.data;
    const result = await getTenantShipments({ slug, page, limit });

    return ok(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/shipments error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const bodyResult = await requireValidBody(request, createShipmentBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const shipmentId = await createTenantShipment({
      slug,
      ...bodyResult.data,
    });

    return ok({ id: shipmentId }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /tenant/shipments error:", error);
    return internalError();
  }
}
