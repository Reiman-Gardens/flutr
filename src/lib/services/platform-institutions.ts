import { auth } from "@/auth";
import { requireUser, canCrossTenant } from "@/lib/authz";
import { ensureTenantExists, TENANT_ERRORS } from "@/lib/tenant";
import {
  getAllInstitutions,
  institutionSlugExists,
  createInstitution,
  getInstitutionById,
  updateInstitutionById,
  deleteInstitution,
} from "@/lib/queries/institution";
import type {
  PlatformCreateInstitutionInput,
  PlatformUpdateInstitutionInput,
} from "@/lib/validation/institution";

export async function getPlatformInstitutions() {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  return getAllInstitutions();
}

export async function createPlatformInstitution(data: PlatformCreateInstitutionInput) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  const exists = await institutionSlugExists(data.slug);
  if (exists) throw new Error("CONFLICT");
  return createInstitution({
    ...data,
    stats_active: false,
  });
}

export async function getPlatformInstitutionById(id: number) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  return getInstitutionById(id);
}

export async function updatePlatformInstitution(id: number, data: PlatformUpdateInstitutionInput) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  try {
    await ensureTenantExists(id);
  } catch (error) {
    if (error instanceof Error && error.message === TENANT_ERRORS.INSTITUTION_NOT_FOUND) {
      throw new Error("NOT_FOUND");
    }

    throw error;
  }
  if (typeof data.slug === "string") {
    const slugExists = await institutionSlugExists(data.slug, id);
    if (slugExists) throw new Error("CONFLICT");
  }
  const updated = await updateInstitutionById(id, data);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function deletePlatformInstitution(id: number) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  try {
    await ensureTenantExists(id);
  } catch (error) {
    if (error instanceof Error && error.message === TENANT_ERRORS.INSTITUTION_NOT_FOUND) {
      throw new Error("NOT_FOUND");
    }

    throw error;
  }
  await deleteInstitution(id);
}
