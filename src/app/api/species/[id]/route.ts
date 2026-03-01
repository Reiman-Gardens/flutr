import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { canManageGlobalButterflies, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species } from "@/lib/schema";
import { speciesIdParamsSchema, updateSpeciesSchema } from "@/lib/validation/species";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const parsedParams = speciesIdParamsSchema.safeParse(resolvedParams);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsedParams.error.issues) },
      { status: 400 },
    );
  }

  const speciesId = parsedParams.data.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateSpeciesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    if (typeof parsed.data.scientific_name === "string") {
      const [existing] = await db
        .select({ id: butterfly_species.id })
        .from(butterfly_species)
        .where(
          and(
            eq(butterfly_species.scientific_name, parsed.data.scientific_name),
            ne(butterfly_species.id, speciesId),
          ),
        )
        .limit(1);

      if (existing) {
        return NextResponse.json({ error: "Scientific name already in use" }, { status: 409 });
      }
    }

    const [updated] = await db
      .update(butterfly_species)
      .set({
        ...parsed.data,
        updated_at: new Date(),
      })
      .where(eq(butterfly_species.id, speciesId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Species not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update species", error);
    return NextResponse.json({ error: "Unable to update species" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const parsedParams = speciesIdParamsSchema.safeParse(resolvedParams);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsedParams.error.issues) },
      { status: 400 },
    );
  }

  try {
    const [deleted] = await db
      .delete(butterfly_species)
      .where(eq(butterfly_species.id, parsedParams.data.id))
      .returning({ id: butterfly_species.id });

    if (!deleted) {
      return NextResponse.json({ error: "Species not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error("Failed to delete species", error);
    return NextResponse.json({ error: "Unable to delete species" }, { status: 500 });
  }
}
