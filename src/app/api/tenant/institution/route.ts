import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageInstitutionProfile, requireUser } from "@/lib/authz";
import { forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { tenantUpdateInstitutionSchema } from "@/lib/validation/institution";

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

    if (!canManageInstitutionProfile(user)) {
      return forbidden();
    }

    return ok({ institution: null });
  } catch (error) {
    logger.error("Unexpected GET /tenant/institution error:", error);
    return internalError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canManageInstitutionProfile(user)) {
      return forbidden();
    }

    const bodyResult = await requireValidBody(request, tenantUpdateInstitutionSchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ institution: null, body: validBody });
  } catch (error) {
    logger.error("Unexpected PATCH /tenant/institution error:", error);
    return internalError();
  }
}
