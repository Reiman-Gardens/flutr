import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { canManageInstitutionProfile, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { updateInstitutionBodySchema } from "@/lib/validation/institution";

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
  } catch {
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

    const body = updateInstitutionBodySchema.parse(await request.json());
    return ok({ institution: null, body });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
