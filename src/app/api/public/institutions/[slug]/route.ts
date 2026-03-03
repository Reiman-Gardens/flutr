import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";
import { internalError, invalidRequest, notFound, ok } from "@/lib/api-response";
import { institutionSlugParamsSchema } from "@/lib/validation/public";
import { ZodError } from "zod";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    void _request;
    const routeParams = await context.params;
    const { slug } = institutionSlugParamsSchema.parse(routeParams);

    const rows = await db.select().from(institutions).where(eq(institutions.slug, slug)).limit(1);

    if (!rows.length) {
      return notFound("Institution not found");
    }

    return ok({ institution: rows[0] });
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidRequest("Invalid request", error.issues);
    }

    return internalError();
  }
}
