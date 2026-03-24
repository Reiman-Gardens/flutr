import { eq, Column } from "drizzle-orm";

import { db } from "@/lib/db";
import { institutions } from "@/lib/schema";
import { forbidden, notFound } from "@/lib/api-response";
import type { AuthenticatedUser } from "@/lib/authz";

export const TENANT_ERRORS = {
  TENANT_REQUIRED_NON_PLATFORM: "Tenant required for non-platform user",
  FORBIDDEN_CROSS_TENANT_ACCESS: "Forbidden cross-tenant access",
  TENANT_REQUIRED_FOR_WRITE: "Tenant required for write operation",
  FORBIDDEN_CROSS_TENANT_WRITE: "Forbidden cross-tenant write",
  INSTITUTION_NOT_FOUND: "Institution not found",
} as const;

export function tenantCondition(
  user: AuthenticatedUser,
  column: Column,
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
      return eq(column, normalizedTargetId);
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

  return eq(column, userInstitutionId);
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

export async function resolveTenantBySlug(user: AuthenticatedUser, slug: string) {
  const [institution] = await db
    .select({
      id: institutions.id,
      slug: institutions.slug,
    })
    .from(institutions)
    .where(eq(institutions.slug, slug))
    .limit(1);

  if (!institution) {
    throw new Error("NOT_FOUND");
  }

  if (user.role !== "SUPERUSER" && user.institutionId !== institution.id) {
    throw new Error("FORBIDDEN");
  }

  return institution.id;
}

export function handleTenantError(error: unknown) {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_ACCESS:
    case TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_WRITE:
    case TENANT_ERRORS.TENANT_REQUIRED_FOR_WRITE:
    case TENANT_ERRORS.TENANT_REQUIRED_NON_PLATFORM:
      return forbidden(error.message);

    case TENANT_ERRORS.INSTITUTION_NOT_FOUND:
      return notFound(error.message);

    default:
      return null;
  }
}
