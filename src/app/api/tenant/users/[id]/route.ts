import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  conflict,
  forbidden,
  internalError,
  notFound,
  ok,
  unauthorized,
  invalidRequest,
} from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { updateUserBodySchema } from "@/lib/validation/users";
import { handleTenantError } from "@/lib/tenant";

import { getTenantUserById, updateTenantUser, deleteTenantUser } from "@/lib/services/tenant-users";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tenant/users/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      return invalidRequest("Invalid user id");
    }

    const user = await getTenantUserById({
      userId,
      slug,
    });

    if (!user) {
      return notFound("User not found");
    }

    return ok({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/users/[id] error:", error);
    return internalError();
  }
}

/**
 * PATCH /api/tenant/users/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      return invalidRequest("Invalid user id");
    }

    const bodyResult = await requireValidBody(request, updateUserBodySchema);

    if ("error" in bodyResult) return bodyResult.error;

    const updated = await updateTenantUser({
      userId,
      slug,
      ...bodyResult.data,
    });

    if (!updated) {
      return notFound("User not found");
    }

    return ok({ user: updated });
  } catch (error: unknown) {
    const dbError = error as { code?: string };
    if (dbError?.code === "23505") {
      return conflict("Email already exists");
    }

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected PATCH /tenant/users/[id] error:", error);
    return internalError();
  }
}

/**
 * DELETE /api/tenant/users/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      return invalidRequest("Invalid user id");
    }

    const deleted = await deleteTenantUser({
      userId,
      slug,
    });

    if (!deleted) {
      return notFound("User not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected DELETE /tenant/users/[id] error:", error);
    return internalError();
  }
}
