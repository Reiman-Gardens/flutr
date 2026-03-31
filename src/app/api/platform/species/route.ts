import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { conflict, forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createSpeciesBodySchema } from "@/lib/validation/species";

import { getPlatformSpecies, createPlatformSpecies } from "@/lib/services/platform-species";

export async function GET(_request: NextRequest) {
  void _request;
  try {
    const species = await getPlatformSpecies();
    return ok({ species });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    logger.error("Unexpected GET /platform/species error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyResult = await requireValidBody(request, createSpeciesBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const species = await createPlatformSpecies(bodyResult.data);

    return ok({ species }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "CONFLICT") return conflict("Species scientific name already exists");
    }

    logger.error("Unexpected POST /platform/species error:", error);
    return internalError();
  }
}
