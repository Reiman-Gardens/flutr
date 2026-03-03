import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";
import type { AuthenticatedUser } from "@/lib/authz";

export const TENANT_ERRORS = {
  TENANT_REQUIRED_NON_PLATFORM: "Tenant required for non-platform user",
  FORBIDDEN_CROSS_TENANT_ACCESS: "Forbidden cross-tenant access",
  TENANT_REQUIRED_FOR_WRITE: "Tenant required for write operation",
  FORBIDDEN_CROSS_TENANT_WRITE: "Forbidden cross-tenant write",
  INSTITUTION_NOT_FOUND: "Institution not found",
} as const;

export function tenantCondition<TColumn>(
  user: AuthenticatedUser,
  column: TColumn,
  targetInstitutionId?: number,
) {
  const normalizedTargetId =
    targetInstitutionId !== undefined && targetInstitutionId !== null
      ? Number(targetInstitutionId)
      : undefined;

  if (
    normalizedTargetId !== undefined &&
    (Number.isNaN(normalizedTargetId) || normalizedTargetId <= 0)
  ) {
    throw new Error(TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_ACCESS);
  }

  if (user.role === "SUPERUSER") {
    if (normalizedTargetId && normalizedTargetId > 0) {
      // Explicit cross-tenant filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return eq(column as any, normalizedTargetId);
    }

    // Platform reads can omit tenant restriction
    return undefined;
  }

  const userInstitutionId = user.institutionId;

  if (!userInstitutionId || userInstitutionId <= 0) {
    throw new Error(TENANT_ERRORS.TENANT_REQUIRED_NON_PLATFORM);
  }

  if (normalizedTargetId !== undefined && normalizedTargetId !== userInstitutionId) {
    throw new Error(TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_ACCESS);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return eq(column as any, userInstitutionId);
}

export function resolveTenantId(user: AuthenticatedUser, requestedInstitutionId?: number): number {
  const normalizedRequestedId =
    requestedInstitutionId !== undefined && requestedInstitutionId !== null
      ? Number(requestedInstitutionId)
      : undefined;

  if (
    normalizedRequestedId !== undefined &&
    (Number.isNaN(normalizedRequestedId) || normalizedRequestedId <= 0)
  ) {
    throw new Error(TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_WRITE);
  }

  if (user.role === "SUPERUSER") {
    if (!normalizedRequestedId) {
      throw new Error(TENANT_ERRORS.TENANT_REQUIRED_FOR_WRITE);
    }

    return normalizedRequestedId;
  }

  const userInstitutionId = user.institutionId;

  if (!userInstitutionId || userInstitutionId <= 0) {
    throw new Error(TENANT_ERRORS.TENANT_REQUIRED_FOR_WRITE);
  }

  if (normalizedRequestedId !== undefined && normalizedRequestedId !== userInstitutionId) {
    throw new Error(TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_WRITE);
  }

  return userInstitutionId;
}

export async function ensureTenantExists(institutionId: number): Promise<void> {
  const normalizedId = Number(institutionId);

  if (Number.isNaN(normalizedId) || normalizedId <= 0) {
    throw new Error(TENANT_ERRORS.INSTITUTION_NOT_FOUND);
  }

  const rows = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, normalizedId))
    .limit(1);

  if (!rows.length) {
    throw new Error(TENANT_ERRORS.INSTITUTION_NOT_FOUND);
  }
}
