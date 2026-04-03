import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { conflict, forbidden, internalError, notFound, ok, unauthorized } from "@/lib/api-response";
import { TENANT_ERRORS } from "@/lib/tenant";
import { requireValidBody } from "@/lib/validation/request";
import { requireValidQuery } from "@/lib/validation/query";
import { createSupplierBodySchema, listSuppliersQuerySchema } from "@/lib/validation/suppliers";

import { getPlatformSuppliers, createPlatformSupplier } from "@/lib/services/platform-suppliers";

export async function GET(request: NextRequest) {
  try {
    const queryResult = requireValidQuery(
      listSuppliersQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if ("error" in queryResult) return queryResult.error;

    const suppliers = await getPlatformSuppliers(queryResult.data.institutionId);

    return ok({ suppliers });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    logger.error("Unexpected GET /platform/suppliers error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyResult = await requireValidBody(request, createSupplierBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const supplier = await createPlatformSupplier(bodyResult.data);

    return ok({ supplier }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === TENANT_ERRORS.INSTITUTION_NOT_FOUND)
        return notFound("Institution not found");
      if (error.message === "CONFLICT")
        return conflict("Supplier code already exists for this institution");
    }

    logger.error("Unexpected POST /platform/suppliers error:", error);
    return internalError();
  }
}
