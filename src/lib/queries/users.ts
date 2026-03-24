import bcrypt from "bcrypt";
import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { tenantCondition } from "@/lib/tenant";

import type { AuthenticatedUser } from "@/lib/authz";
import type { CreateUserBody, UpdateUserBody } from "@/lib/validation/users";

/**
 * TENANT QUERY
 *
 * List users for the current tenant scope.
 */
export async function listUsersForTenant(institutionId: number, user: AuthenticatedUser) {
  const condition = tenantCondition(user, users.institution_id, institutionId);

  return db
    .select({
      id: users.id,
      institutionId: users.institution_id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    })
    .from(users)
    .where(condition)
    .orderBy(asc(users.name));
}

/**
 * Fetch a single user by ID (global, no tenant scoping).
 */
export async function getUserById(userId: number) {
  const [row] = await db
    .select({
      id: users.id,
      institutionId: users.institution_id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

/**
 * TENANT QUERY
 *
 * Fetch a single user by ID, scoped to the tenant.
 * Returns null for users outside the tenant (indistinguishable from not found).
 */
export async function getUserByIdForTenant(
  userId: number,
  institutionId: number,
  user: AuthenticatedUser,
) {
  const condition = tenantCondition(user, users.institution_id, institutionId);

  const [row] = await db
    .select({
      id: users.id,
      institutionId: users.institution_id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    })
    .from(users)
    .where(and(eq(users.id, userId), condition))
    .limit(1);

  return row ?? null;
}

/**
 * Check whether an email already exists for a tenant.
 * Optionally exclude a user ID for update checks.
 */
export async function emailExistsForTenant(
  institutionId: number,
  email: string,
  excludeId?: number,
) {
  const conditions = excludeId
    ? and(eq(users.institution_id, institutionId), eq(users.email, email), ne(users.id, excludeId))
    : and(eq(users.institution_id, institutionId), eq(users.email, email));

  const [row] = await db.select({ id: users.id }).from(users).where(conditions).limit(1);

  return !!row;
}

/**
 * TENANT QUERY
 *
 * Create a user for the given tenant.
 */
export async function createUser(institutionId: number, input: CreateUserBody) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  const [row] = await db
    .insert(users)
    .values({
      institution_id: institutionId,
      name: input.name,
      email: input.email,
      password_hash: passwordHash,
      role: input.role ?? "EMPLOYEE",
    })
    .returning({
      id: users.id,
      institutionId: users.institution_id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    });

  return row;
}

/**
 * TENANT QUERY
 *
 * Update a user by ID, scoped to the tenant.
 * Returns null if the user is not found within the tenant.
 */
export async function updateUserForTenant(
  userId: number,
  institutionId: number,
  user: AuthenticatedUser,
  input: UpdateUserBody,
) {
  const condition = tenantCondition(user, users.institution_id, institutionId);

  const updateData: Record<string, unknown> = { updated_at: new Date() };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.password !== undefined) {
    updateData.password_hash = await bcrypt.hash(input.password, 10);
  }

  const [row] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, userId), condition))
    .returning({
      id: users.id,
      institutionId: users.institution_id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    });

  return row ?? null;
}

/**
 * TENANT QUERY
 *
 * Delete a user by ID, scoped to the tenant.
 * Returns false if the user is not found within the tenant.
 */
export async function deleteUserForTenant(
  userId: number,
  institutionId: number,
  user: AuthenticatedUser,
) {
  const condition = tenantCondition(user, users.institution_id, institutionId);

  const result = await db
    .delete(users)
    .where(and(eq(users.id, userId), condition))
    .returning({ id: users.id });

  return result.length > 0;
}
