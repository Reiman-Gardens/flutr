import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { conflict, forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { platformCreateInstitutionSchema } from "@/lib/validation/institution";

import {
  getPlatformInstitutions,
  createPlatformInstitution,
} from "@/lib/services/platform-institutions";

export async function GET(_request: NextRequest) {
  void _request;
  try {
    const institutions = await getPlatformInstitutions();
    return ok({ institutions });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    logger.error("Unexpected GET /platform/institutions error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyResult = await requireValidBody(request, platformCreateInstitutionSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const institution = await createPlatformInstitution(bodyResult.data);

    return ok({ institution }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "CONFLICT") return conflict("Slug already in use");
    }

    logger.error("Unexpected POST /platform/institutions error:", error);
    return internalError();
  }
}
