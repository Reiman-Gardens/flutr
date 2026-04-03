import { auth } from "@/auth";
import { requireUser, canManageGlobalButterflies } from "@/lib/authz";
import {
  listSpeciesGlobal,
  getSpeciesById,
  createSpecies,
  updateSpecies,
  deleteSpecies,
} from "@/lib/queries/species";
import type { CreateSpeciesBody, UpdateSpeciesBody } from "@/lib/validation/species";

function isUniqueViolation(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  const causeCode =
    "cause" in error &&
    error.cause !== null &&
    typeof error.cause === "object" &&
    "code" in error.cause
      ? (error.cause as { code?: unknown }).code
      : undefined;

  return code === "23505" || causeCode === "23505";
}

export async function getPlatformSpecies() {
  const user = requireUser(await auth());
  if (!canManageGlobalButterflies(user)) throw new Error("FORBIDDEN");
  return listSpeciesGlobal();
}

export async function getPlatformSpeciesById(id: number) {
  const user = requireUser(await auth());
  if (!canManageGlobalButterflies(user)) throw new Error("FORBIDDEN");
  const species = await getSpeciesById(id);
  if (!species) throw new Error("NOT_FOUND");
  return species;
}

export async function createPlatformSpecies(data: CreateSpeciesBody) {
  const user = requireUser(await auth());
  if (!canManageGlobalButterflies(user)) throw new Error("FORBIDDEN");
  try {
    return await createSpecies(data);
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("CONFLICT");
    throw error;
  }
}

export async function updatePlatformSpecies(id: number, data: UpdateSpeciesBody) {
  const user = requireUser(await auth());
  if (!canManageGlobalButterflies(user)) throw new Error("FORBIDDEN");
  const existing = await getSpeciesById(id);
  if (!existing) throw new Error("NOT_FOUND");
  try {
    const updated = await updateSpecies(id, data);
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("CONFLICT");
    throw error;
  }
}

export async function deletePlatformSpecies(id: number) {
  const user = requireUser(await auth());
  if (!canManageGlobalButterflies(user)) throw new Error("FORBIDDEN");
  const existing = await getSpeciesById(id);
  if (!existing) throw new Error("NOT_FOUND");
  await deleteSpecies(id);
}
