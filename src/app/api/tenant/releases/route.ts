import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { internalError, invalidRequest, mapAuthError, ok } from "@/lib/api-response";
import { handleTenantError } from "@/lib/tenant";

import { getTenantReleases } from "@/lib/services/tenant-releases";
import { listReleasesQuerySchema } from "@/lib/validation/releases";

export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");

    if (!slug) {
      return invalidRequest("Missing tenant slug");
    }

    const url = new URL(request.url);
    const queryResult = listReleasesQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!queryResult.success) {
      return invalidRequest("Invalid query parameters", queryResult.error.issues);
    }

    const result = await getTenantReleases({
      slug,
      page: queryResult.data.page,
      limit: queryResult.data.limit,
    });
    return ok(result);
  } catch (error) {
    const authError = mapAuthError(error);
    if (authError) return authError;

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/releases error:", error);
    return internalError();
  }
}
