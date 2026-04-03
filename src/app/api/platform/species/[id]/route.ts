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
import { speciesIdParamsSchema, updateSpeciesBodySchema } from "@/lib/validation/species";

import {
  getPlatformSpeciesById,
  updatePlatformSpecies,
  deletePlatformSpecies,
} from "@/lib/services/platform-species";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = speciesIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const species = await getPlatformSpeciesById(result.data.id);

    return ok({ species });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Species not found");
    }

    logger.error("Unexpected GET /platform/species/[id] error:", error);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = speciesIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    const bodyResult = await requireValidBody(request, updateSpeciesBodySchema);
    if ("error" in bodyResult) return bodyResult.error;

    const species = await updatePlatformSpecies(result.data.id, bodyResult.data);

    return ok({ species });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Species not found");
      if (error.message === "CONFLICT") return conflict("Species scientific name already exists");
    }

    logger.error("Unexpected PATCH /platform/species/[id] error:", error);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const result = speciesIdParamsSchema.safeParse(routeParams);
    if (!result.success) {
      return invalidRequest("Invalid request parameters", result.error.issues);
    }

    await deletePlatformSpecies(result.data.id);

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Species not found");
    }

    logger.error("Unexpected DELETE /platform/species/[id] error:", error);
    return internalError();
  }
}
