import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  conflict,
  forbidden,
  internalError,
  ok,
  unauthorized,
  invalidRequest,
} from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createUserBodySchema } from "@/lib/validation/users";
import { handleTenantError } from "@/lib/tenant";

import { getTenantUsers, createTenantUser } from "@/lib/services/tenant-users";

/**
 * GET /api/tenant/users
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const users = await getTenantUsers({ slug });

    return ok({ users });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/users error:", error);
    return internalError();
  }
}

/**
 * POST /api/tenant/users
 */
export async function POST(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const bodyResult = await requireValidBody(request, createUserBodySchema);

    if ("error" in bodyResult) return bodyResult.error;

    const created = await createTenantUser({
      ...bodyResult.data,
      slug,
    });

    return ok({ user: created });
  } catch (error: unknown) {
    const dbError = error as { code?: string; cause?: { code?: string } };
    if (dbError?.code === "23505" || dbError?.cause?.code === "23505") {
      return conflict("Email already exists");
    }

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /tenant/users error:", error);
    return internalError();
  }
}
