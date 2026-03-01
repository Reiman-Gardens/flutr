import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { users } from "@/lib/schema";
import { deleteUserSchema, updateUserSchema } from "@/lib/validation/users";
import {
  canAssignRole,
  canDeleteUser,
  canManageUsers,
  canModifyUser,
  requireUser,
} from "@/lib/authz";
import { ensureTenantExists, resolveTenantId, tenantCondition } from "@/lib/tenant";

function parseUserId(id: string | undefined) {
  if (!id || !/^\d+$/.test(id)) return null;
  const parsed = Number.parseInt(id, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const userId = parseUserId(resolvedParams.id);

  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const tenantFilter = tenantCondition(user, users.institution_id);
    const userCondition = tenantFilter
      ? and(eq(users.id, userId), tenantFilter)
      : eq(users.id, userId);

    const [record] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        institutionId: users.institution_id,
      })
      .from(users)
      .where(userCondition)
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    logger.error("Failed to load user", error);
    return NextResponse.json({ error: "Unable to load user" }, { status: 500 });
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

  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const userId = parseUserId(resolvedParams.id);

  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const payload = parsed.data;
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
    const tenantFilter = tenantCondition(user, users.institution_id, targetInstitutionId);
    const userCondition = tenantFilter
      ? and(eq(users.id, userId), tenantFilter)
      : eq(users.id, userId);

    const [record] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(userCondition)
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!canModifyUser(user, record)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (payload.role && !canAssignRole(user, payload.role, record)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.email) updateData.email = payload.email;
    if (payload.role) updateData.role = payload.role;
    if (payload.password) {
      updateData.password_hash = await bcrypt.hash(payload.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await db.update(users).set(updateData).where(userCondition);

    return NextResponse.json({ updated: true });
  } catch (error) {
    logger.error("Failed to update user", error);
    return NextResponse.json({ error: "Unable to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const userId = parseUserId(resolvedParams.id);

  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = deleteUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  let targetInstitutionId: number;
  try {
    targetInstitutionId = resolveTenantId(user, parsed.data.institutionId);
  } catch {
    return NextResponse.json({ error: "Tenant required" }, { status: 403 });
  }

  try {
    await ensureTenantExists(targetInstitutionId);
  } catch {
    return NextResponse.json({ error: "Institution not found" }, { status: 400 });
  }

  try {
    const tenantFilter = tenantCondition(user, users.institution_id, targetInstitutionId);
    const userCondition = tenantFilter
      ? and(eq(users.id, userId), tenantFilter)
      : eq(users.id, userId);

    const [record] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(userCondition)
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!canDeleteUser(user, record)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [deleted] = await db.delete(users).where(userCondition).returning({ id: users.id });

    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error("Failed to delete user", error);
    return NextResponse.json({ error: "Unable to delete user" }, { status: 500 });
  }
}
