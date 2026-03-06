import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { canManageUsers, requireUser } from "@/lib/authz";
import { forbidden, internalError, ok, unauthorized } from "@/lib/api-response";
import { createUserBodySchema, listUsersQuerySchema } from "@/lib/validation/users";
import { requireValidBody } from "@/lib/validation/request";
import { requireValidQuery } from "@/lib/validation/query";

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

    const queryResult = requireValidQuery(
      listUsersQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if ("error" in queryResult) return queryResult.error;

    const query = queryResult.data;

    return ok({ users: [], query });
  } catch (error) {
    logger.error("Unexpected GET /tenant/users error:", error);
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

    const bodyResult = await requireValidBody(request, createUserBodySchema);

    if ("error" in bodyResult) return bodyResult.error;

    const validBody = bodyResult.data;

    return ok({ user: null, body: validBody }, 201);
  } catch (error) {
    logger.error("Unexpected POST /tenant/users error:", error);
    return internalError();
  }
}
