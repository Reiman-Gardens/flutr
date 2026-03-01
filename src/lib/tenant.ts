import { SQLWrapper, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";

/**
 * Returns a tenant filter condition for a given column.
 *
 * Behavior:
 * - SUPERUSER:
 *    - If targetInstitutionId provided → scoped to that tenant
 *    - If not provided → no restriction (cross-tenant read)
 * - All other roles:
 *    - Always restricted to user's institution
 *    - Cannot override targetInstitutionId
 */
export function tenantCondition(
  user: { role?: string | null; institutionId?: number | null },
  column: SQLWrapper,
  targetInstitutionId?: number | null,
) {
  const isSuper = user.role === "SUPERUSER";

  // Validate targetInstitutionId if provided
  const hasValidTarget =
    typeof targetInstitutionId === "number" &&
    Number.isInteger(targetInstitutionId) &&
    targetInstitutionId > 0;

  if (isSuper) {
    if (hasValidTarget) {
      return eq(column, targetInstitutionId);
    }
    // SUPERUSER without target → full cross-tenant access (read)
    return undefined;
  }

  // Non-superuser must have institutionId
  if (
    typeof user.institutionId !== "number" ||
    !Number.isInteger(user.institutionId) ||
    user.institutionId <= 0
  ) {
    throw new Error("Tenant required for non-platform user");
  }

  // Prevent cross-tenant override attempts
  if (hasValidTarget && targetInstitutionId !== user.institutionId) {
    throw new Error("Forbidden cross-tenant access");
  }

  return eq(column, user.institutionId);
}

/**
 * Resolves the institution id to use for write operations.
 *
 * Behavior:
 * - SUPERUSER → must explicitly provide requestedInstitutionId
 * - Others → always use user's institution
 */
export function resolveTenantId(
  user: { role?: string | null; institutionId?: number | null },
  requestedInstitutionId?: number | null,
) {
  const isSuper = user.role === "SUPERUSER";

  const hasValidRequested =
    typeof requestedInstitutionId === "number" &&
    Number.isInteger(requestedInstitutionId) &&
    requestedInstitutionId > 0;

  if (isSuper) {
    if (!hasValidRequested) {
      throw new Error("Tenant required for write operation");
    }
    return requestedInstitutionId;
  }

  // Non-superuser must have institutionId
  if (
    typeof user.institutionId !== "number" ||
    !Number.isInteger(user.institutionId) ||
    user.institutionId <= 0
  ) {
    throw new Error("Tenant required for write operation");
  }

  // Prevent cross-tenant write attempts
  if (hasValidRequested && requestedInstitutionId !== user.institutionId) {
    throw new Error("Forbidden cross-tenant write");
  }

  return user.institutionId;
}

/**
 * Ensures the target institution exists before write operations.
 */
export async function ensureTenantExists(institutionId: number) {
  if (typeof institutionId !== "number" || !Number.isInteger(institutionId) || institutionId <= 0) {
    throw new Error("Invalid institution id");
  }

  const [row] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .limit(1);

  if (!row) {
    throw new Error("Institution not found");
  }
}
