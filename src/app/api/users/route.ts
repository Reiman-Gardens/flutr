import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { users } from "@/lib/schema";
import { createUserSchema, listUsersQuerySchema } from "@/lib/validation/users";
import { canAssignRole, canManageUsers, requireUser } from "@/lib/authz";
import { ensureTenantExists, resolveTenantId, tenantCondition } from "@/lib/tenant";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET(request: Request) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsedQuery = listUsersQuerySchema.safeParse(query);
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsedQuery.error.issues) },
      { status: 400 },
    );
  }

  let tenantFilter;
  try {
    tenantFilter = tenantCondition(user, users.institution_id, parsedQuery.data.institutionId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseQuery = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      institutionId: users.institution_id,
    })
    .from(users);

  const rows = tenantFilter ? await baseQuery.where(tenantFilter) : await baseQuery;

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  if (!canAssignRole(user, payload.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let targetInstitutionId: number;
  try {
    targetInstitutionId = resolveTenantId(user, payload.institutionId);
  } catch {
    return NextResponse.json({ error: "Tenant required" }, { status: 403 });
  }

  try {
    await ensureTenantExists(targetInstitutionId);
  } catch {
    return NextResponse.json({ error: "Institution not found" }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, payload.email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const [created] = await db
      .insert(users)
      .values({
        name: payload.name,
        email: payload.email,
        password_hash: passwordHash,
        role: payload.role,
        institution_id: targetInstitutionId,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        institutionId: users.institution_id,
      });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Failed to create user", error);
    return NextResponse.json({ error: "Unable to create user" }, { status: 500 });
  }
}
