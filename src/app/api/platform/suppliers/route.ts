import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { canCrossTenant, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
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
  } catch {
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

    const body = createSupplierBodySchema.parse(await request.json());
    return ok({ supplier: null, body }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
