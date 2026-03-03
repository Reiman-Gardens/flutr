import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { shipmentIdParamsSchema, createReleaseBodySchema } from "@/lib/validation/releases";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canCreateRelease(user)) {
      return forbidden();
    }

    const routeParams = await context.params;
    const params = shipmentIdParamsSchema.parse(routeParams);
    const body = createReleaseBodySchema.parse(await request.json());

    return ok({ release: null, params, body }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
