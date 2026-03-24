import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  conflict,
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { releaseInFlightParamsSchema, createInFlightBodySchema } from "@/lib/validation/releases";
import { handleTenantError } from "@/lib/tenant";
import { createTenantReleaseInFlight, RELEASE_ERRORS } from "@/lib/services/tenant-releases";

interface RouteContext {
  params: Promise<{ releaseId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const routeParams = await context.params;
    const result = releaseInFlightParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const bodyResult = await requireValidBody(request, createInFlightBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const inFlight = await createTenantReleaseInFlight({
      slug,
      releaseId: result.data.releaseId,
      ...bodyResult.data,
    });

    return ok({ inFlight }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === RELEASE_ERRORS.INVALID_QUANTITY) {
        return invalidRequest(error.message);
      }

      if (error.message === RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND) {
        return notFound(error.message);
      }

      if (error.message === RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND) {
        return notFound(error.message);
      }

      if (error.message === RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING) {
        return conflict(error.message);
      }

      if (error.message === RELEASE_ERRORS.SHIPMENT_ITEM_RELEASE_MISMATCH) {
        return conflict(error.message);
      }

      if (error.message === RELEASE_ERRORS.IN_FLIGHT_ALREADY_EXISTS) {
        return conflict(error.message);
      }

      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /tenant/releases/[releaseId]/in-flight error:", error);
    return internalError();
  }
}
