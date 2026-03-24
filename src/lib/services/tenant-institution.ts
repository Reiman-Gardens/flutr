import { auth } from "@/auth";
import { requireUser, canManageInstitutionProfile } from "@/lib/authz";
import { ensureTenantExists, resolveTenantBySlug } from "@/lib/tenant";
import { getTenantInstitution, updateTenantInstitution } from "@/lib/queries/institution";

export async function getTenantInstitutionService(slug: string) {
  const session = await auth();
  const user = requireUser(session);

  if (!canManageInstitutionProfile(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  await ensureTenantExists(tenantId);

  const institution = await getTenantInstitution(tenantId);

  if (!institution) {
    throw new Error("NOT_FOUND");
  }

  return institution;
}

export async function updateTenantInstitutionService(slug: string, data: Record<string, unknown>) {
  const session = await auth();
  const user = requireUser(session);

  if (!canManageInstitutionProfile(user)) {
    throw new Error("FORBIDDEN");
  }

  const tenantId = await resolveTenantBySlug(user, slug);

  await ensureTenantExists(tenantId);

  const updated = await updateTenantInstitution(tenantId, data);

  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  return updated;
}
