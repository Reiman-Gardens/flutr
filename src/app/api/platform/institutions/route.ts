import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { requireUser, canCreateInstitution } from "@/lib/authz";
import { forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { platformCreateInstitutionSchema } from "@/lib/validation/institution";

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

    if (!canCreateInstitution(user)) {
      return forbidden();
    }

    return ok({ institutions: [] });
  } catch (error) {
    logger.error("Unexpected GET /platform/institutions error:", error);
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

    if (!canCreateInstitution(user)) {
      return forbidden();
    }

    const bodyResult = await requireValidBody(request, platformCreateInstitutionSchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ institution: null, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /platform/institutions error:", error);
    return internalError();
  }
}
