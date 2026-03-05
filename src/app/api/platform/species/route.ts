import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageGlobalButterflies, requireUser } from "@/lib/authz";
import { forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createSpeciesBodySchema } from "@/lib/validation/species";

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

    if (!canManageGlobalButterflies(user)) {
      return forbidden();
    }

    return ok({ species: [] });
  } catch (error) {
    logger.error("Unexpected GET /platform/species error:", error);
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

    if (!canManageGlobalButterflies(user)) {
      return forbidden();
    }

    const bodyResult = await requireValidBody(request, createSpeciesBodySchema);
    if ("error" in bodyResult) return bodyResult.error;
    const validBody = bodyResult.data;

    return ok({ species: null, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /platform/species error:", error);
    return internalError();
  }
}
