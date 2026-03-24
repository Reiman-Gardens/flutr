import { auth } from "@/auth";
import { requireUser, canReadSpecies, canManageSpeciesOverrides } from "@/lib/authz";
import { resolveTenantBySlug } from "@/lib/tenant";
import { listSpeciesForTenant, getSpeciesById, upsertSpeciesOverride } from "@/lib/queries/species";
import type { UpdateSpeciesOverrideBody } from "@/lib/validation/species";

export async function getTenantSpecies({ slug }: { slug: string }) {
  const user = requireUser(await auth());
  if (!canReadSpecies(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  return listSpeciesForTenant(tenantId);
}

export async function updateTenantSpeciesOverride({
  slug,
  speciesId,
  ...updateData
}: { slug: string; speciesId: number } & UpdateSpeciesOverrideBody) {
  const user = requireUser(await auth());
  if (!canManageSpeciesOverrides(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  const existing = await getSpeciesById(speciesId);
  if (!existing) throw new Error("NOT_FOUND");
  return upsertSpeciesOverride(tenantId, speciesId, updateData);
}
