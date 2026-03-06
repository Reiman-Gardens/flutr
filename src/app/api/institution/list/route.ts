import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { canCreateInstitution, canCrossTenant, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { institutions } from "@/lib/schema";
import { createInstitutionSchema } from "@/lib/validation/institution";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET() {
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

  try {
    const rows = await db
      .select({
        id: institutions.id,
        slug: institutions.slug,
        name: institutions.name,
      })
      .from(institutions);

    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Failed to load institutions", error);
    return NextResponse.json({ error: "Unable to load institutions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateInstitution(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createInstitutionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    const [existing] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.slug, parsed.data.slug))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
    }

    const [created] = await db.insert(institutions).values(parsed.data).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Failed to create institution", error);
    return NextResponse.json({ error: "Unable to create institution" }, { status: 500 });
  }
}
