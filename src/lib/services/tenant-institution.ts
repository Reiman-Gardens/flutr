import { auth } from "@/auth";
import { requireUser, canManageInstitutionProfile } from "@/lib/authz";
import { resolveTenantBySlug, TENANT_ERRORS } from "@/lib/tenant";
import { getTenantInstitution, updateTenantInstitution } from "@/lib/queries/institution";

export async function getTenantInstitutionService(slug: string) {
  const session = await auth();
  const user = requireUser(session);

  if (!canManageInstitutionProfile(user)) {
    throw new Error(TENANT_ERRORS.FORBIDDEN_CROSS_TENANT_ACCESS);
  }

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
