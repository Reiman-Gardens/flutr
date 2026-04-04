import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/authz";
import { requireUser, canManageInstitutionProfile } from "@/lib/authz";
import { resolveTenantBySlug, TENANT_ERRORS } from "@/lib/tenant";
import { getTenantInstitution, updateTenantInstitution } from "@/lib/queries/institution";

/**
 * Read-only access to the institution for any authenticated tenant member.
 * Used by the tenant organization page to display settings to all roles.
 *
 * Accepts an optional pre-resolved user to avoid redundant auth() calls
 * when the caller has already authenticated.
 */
export async function viewTenantInstitutionService(slug: string, caller?: AuthenticatedUser) {
  const user = caller ?? requireUser(await auth());

  const tenantId = await resolveTenantBySlug(user, slug);

  const institution = await getTenantInstitution(tenantId);

  if (!institution) {
    throw new Error(TENANT_ERRORS.INSTITUTION_NOT_FOUND);
  }

  return institution;
}

export async function updateTenantInstitutionService(slug: string, data: Record<string, unknown>) {
  const session = await auth();
  const user = requireUser(session);

  if (!canManageInstitutionProfile(user)) {
    throw new Error(TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_ACCESS);
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  const updated = await updateTenantInstitution(tenantId, data);

  if (!updated) {
    throw new Error(TENANT_ERRORS.INSTITUTION_NOT_FOUND);
  }

  return updated;
}
