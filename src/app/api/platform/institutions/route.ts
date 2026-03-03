import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { requireUser, canCreateInstitution } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { createInstitutionBodySchema } from "@/lib/validation/institutions";

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

    if (!canCreateInstitution(user)) {
      return forbidden();
    }

    const body = createInstitutionBodySchema.parse(await request.json());
    return ok({ institution: null, body }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
