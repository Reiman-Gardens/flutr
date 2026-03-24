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
import { supplierIdParamsSchema, updateSupplierBodySchema } from "@/lib/validation/suppliers";
import { handleTenantError } from "@/lib/tenant";

import {
  getPlatformSupplierById,
  updatePlatformSupplier,
  deletePlatformSupplier,
  SUPPLIER_ERRORS,
} from "@/lib/services/platform-suppliers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = supplierIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const supplier = await getPlatformSupplierById(result.data.id);
    if (!supplier) {
      return notFound("Supplier not found");
    }

    return ok({ supplier });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /platform/suppliers/[id] error:", error);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = supplierIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const bodyResult = await requireValidBody(request, updateSupplierBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const updated = await updatePlatformSupplier(result.data.id, bodyResult.data);

    return ok({ supplier: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Supplier not found");
      if (error.message === "CONFLICT")
        return conflict("Supplier code already exists for this institution");
      if (error.message === SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS) return conflict(error.message);
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /platform/suppliers/[id] error:", error);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = supplierIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    await deletePlatformSupplier(result.data.id);

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Supplier not found");
      if (error.message === SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS) return conflict(error.message);
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected DELETE /platform/suppliers/[id] error:", error);
    return internalError();
  }
}
