import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { canManageUsers, requireUser } from "@/lib/authz";
import { forbidden, internalError, invalidRequest, ok, unauthorized } from "@/lib/api-response";
import { createUserBodySchema, listUsersQuerySchema } from "@/lib/validation/users";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    let user;
    try {
      user = requireUser(session);
    } catch {
      return unauthorized();
    }

    if (!canManageUsers(user)) {
      return forbidden();
    }

    const url = new URL(request.url);
    const query = listUsersQuerySchema.parse({
      institutionId: url.searchParams.get("institutionId") ?? undefined,
    });

    return ok({ users: [], query });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
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

    if (!canManageUsers(user)) {
      return forbidden();
    }

    const body = createUserBodySchema.parse(await request.json());
    return ok({ user: null, body }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }
    return internalError();
  }
}
