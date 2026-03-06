import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canCrossTenant, requireUser } from "@/lib/authz";
import { forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createSupplierBodySchema } from "@/lib/validation/suppliers";

export async function GET(request: NextRequest) {
  try {
    void request;
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canCrossTenant(user)) {
      return forbidden();
    }

    return ok({ suppliers: [] });
  } catch (error) {
    logger.error("Unexpected GET /platform/suppliers error:", error);
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

    if (!canCrossTenant(user)) {
      return forbidden();
    }

    const bodyResult = await requireValidBody(request, createSupplierBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ supplier: null, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /platform/suppliers error:", error);
    return internalError();
  }
}
