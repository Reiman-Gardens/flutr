import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  forbidden,
  internalError,
  invalidRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { requireValidBody } from "@/lib/validation/request";
import { createNewsSchema } from "@/lib/validation/news";
import { handleTenantError } from "@/lib/tenant";

import { getTenantNews, createTenantNews } from "@/lib/services/tenant-news";

export async function GET(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) return invalidRequest("Missing tenant slug");

    const news = await getTenantNews({ slug });

    return ok({ news });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected GET /tenant/news error:", error);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.headers.get("x-tenant-slug");
    if (!slug) return invalidRequest("Missing tenant slug");

    const bodyResult = await requireValidBody(request, createNewsSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const entry = await createTenantNews({ slug, ...bodyResult.data });

    return ok({ news: entry }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorized();
      if (error.message === "FORBIDDEN") return forbidden();
      if (error.message === "NOT_FOUND") return notFound("Institution not found");
    }

    const tenantError = handleTenantError(error);
    if (tenantError) return tenantError;

    logger.error("Unexpected POST /tenant/news error:", error);
    return internalError();
  }
}
