import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { canManageGlobalButterflies, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species } from "@/lib/schema";
import { createSpeciesSchema } from "@/lib/validation/species";

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

  if (!canManageGlobalButterflies(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await db.select().from(butterfly_species);
    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Failed to load species", error);
    return NextResponse.json({ error: "Unable to load species" }, { status: 500 });
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

  if (!canManageGlobalButterflies(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createSpeciesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    const [existing] = await db
      .select({ id: butterfly_species.id })
      .from(butterfly_species)
      .where(eq(butterfly_species.scientific_name, parsed.data.scientific_name))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Scientific name already in use" }, { status: 409 });
    }

    const [created] = await db.insert(butterfly_species).values(parsed.data).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Failed to create species", error);
    return NextResponse.json({ error: "Unable to create species" }, { status: 500 });
  }
}
