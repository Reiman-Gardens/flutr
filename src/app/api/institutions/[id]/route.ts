import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { canCrossTenant, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";
import { ensureTenantExists } from "@/lib/tenant";
import { updateInstitutionSchema } from "@/lib/validation/institutions";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCrossTenant(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const institutionId =
    /^\d+$/.test(resolvedParams.id) && Number.parseInt(resolvedParams.id, 10) > 0
      ? Number.parseInt(resolvedParams.id, 10)
      : null;

  if (!institutionId) {
    return NextResponse.json({ error: "Invalid institution id" }, { status: 400 });
  }

  try {
    await ensureTenantExists(institutionId);

    const [institution] = await db
      .select()
      .from(institutions)
      .where(eq(institutions.id, institutionId))
      .limit(1);

    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    return NextResponse.json(institution);
  } catch (error) {
    if (error instanceof Error && error.message === "Institution not found") {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    logger.error("Failed to load institution", error);
    return NextResponse.json({ error: "Unable to load institution" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCrossTenant(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const institutionId =
    /^\d+$/.test(resolvedParams.id) && Number.parseInt(resolvedParams.id, 10) > 0
      ? Number.parseInt(resolvedParams.id, 10)
      : null;

  if (!institutionId) {
    return NextResponse.json({ error: "Invalid institution id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateInstitutionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    await ensureTenantExists(institutionId);

    if (typeof parsed.data.slug === "string") {
      const [existing] = await db
        .select({ id: institutions.id })
        .from(institutions)
        .where(and(eq(institutions.slug, parsed.data.slug), ne(institutions.id, institutionId)))
        .limit(1);

      if (existing) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(institutions)
      .set({
        ...parsed.data,
        updated_at: new Date(),
      })
      .where(eq(institutions.id, institutionId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Institution not found") {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    logger.error("Failed to update institution", error);
    return NextResponse.json({ error: "Unable to update institution" }, { status: 500 });
  }
}
