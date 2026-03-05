import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageSuppliers, canReadSuppliers, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createSupplierBodySchema, listSuppliersQuerySchema } from "@/lib/validation/suppliers";
import { requireValidQuery } from "@/lib/validation/query";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canReadSuppliers(user)) {
      return forbidden();
    }

    const url = new URL(request.url);

    const result = requireValidQuery(listSuppliersQuerySchema, {
      institutionId: url.searchParams.get("institutionId") ?? undefined,
    });
    if ("error" in result) return result.error;
    const query = result.data;

    return ok({ suppliers: [], query });
  } catch (error) {
    logger.error("Unexpected GET /tenant/suppliers error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canManageSuppliers(user)) {
      return forbidden();
    }

    const bodyResult = await requireValidBody(request, createSupplierBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ supplier: null, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /tenant/suppliers error:", error);
    return internalError();
  }
}
