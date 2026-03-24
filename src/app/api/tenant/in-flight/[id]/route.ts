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
import { idParamSchema } from "@/lib/validation/params";
import { requireValidBody } from "@/lib/validation/request";
import { updateInFlightQuantitySchema } from "@/lib/validation/releases";
import { handleTenantError } from "@/lib/tenant";
import {
  deleteTenantInFlight,
  RELEASE_ERRORS,
  updateTenantInFlight,
} from "@/lib/services/tenant-releases";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const routeParams = await context.params;
    const result = idParamSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const bodyResult = await requireValidBody(request, updateInFlightQuantitySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const updated = await updateTenantInFlight({
      slug,
      inFlightId: result.data.id,
      ...bodyResult.data,
    });

    return ok({ inFlight: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === RELEASE_ERRORS.INVALID_QUANTITY) {
        return invalidRequest(error.message);
      }

      if (error.message === RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND) {
        return notFound(error.message);
      }

      if (error.message === RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND) {
        return notFound(error.message);
      }

      if (error.message === RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING) {
        return conflict(error.message);
      }

      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /tenant/in-flight/[id] error:", error);
    return internalError();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const routeParams = await context.params;
    const result = idParamSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    await deleteTenantInFlight({
      slug,
      inFlightId: result.data.id,
    });

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND) {
        return notFound(error.message);
      }

      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected DELETE /tenant/in-flight/[id] error:", error);
    return internalError();
  }
}
