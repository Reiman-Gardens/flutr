import { auth } from "@/auth";
import { requireUser, canManageInstitutionProfile } from "@/lib/authz";
import { resolveTenantBySlug } from "@/lib/tenant";
import {
  listNewsForTenant,
  getNewsEntryById,
  createNewsEntry,
  updateNewsEntry,
  deleteNewsEntry,
} from "@/lib/queries/news";
import type { CreateNewsInput, UpdateNewsInput } from "@/lib/validation/news";

export async function getTenantNews({ slug }: { slug: string }) {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  return listNewsForTenant(tenantId);
}

export async function createTenantNews({ slug, ...newsData }: CreateNewsInput & { slug: string }) {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  return createNewsEntry(tenantId, newsData);
}

export async function updateTenantNewsEntry({
  id,
  slug,
  ...updateData
}: UpdateNewsInput & { id: number; slug: string }) {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  const existing = await getNewsEntryById(tenantId, id);
  if (!existing) throw new Error("NOT_FOUND");
  const updated = await updateNewsEntry(tenantId, id, updateData);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function deleteTenantNewsEntry({ id, slug }: { id: number; slug: string }) {
  const user = requireUser(await auth());
  if (!canManageInstitutionProfile(user)) throw new Error("FORBIDDEN");
  const tenantId = await resolveTenantBySlug(user, slug);
  const existing = await getNewsEntryById(tenantId, id);
  if (!existing) throw new Error("NOT_FOUND");
  const deleted = await deleteNewsEntry(tenantId, id);
  if (!deleted) throw new Error("NOT_FOUND");
  return deleted;
}
