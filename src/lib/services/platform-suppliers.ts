import { auth } from "@/auth";
import { requireUser, canCrossTenant } from "@/lib/authz";
import {
  listSuppliersGlobal,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  supplierCodeExists,
  SUPPLIER_ERRORS,
} from "@/lib/queries/suppliers";
import type { CreateSupplierBody, UpdateSupplierBody } from "@/lib/validation/suppliers";

export { SUPPLIER_ERRORS };

export async function getPlatformSuppliers() {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  return listSuppliersGlobal();
}

export async function createPlatformSupplier(data: CreateSupplierBody) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  const codeExists = await supplierCodeExists(data.code);
  if (codeExists) throw new Error("CONFLICT");
  return createSupplier(data);
}

export async function getPlatformSupplierById(id: number) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  return getSupplierById(id);
}

export async function updatePlatformSupplier(id: number, data: UpdateSupplierBody) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  const existing = await getSupplierById(id);
  if (!existing) throw new Error("NOT_FOUND");
  if (data.code !== undefined) {
    const codeExists = await supplierCodeExists(data.code, id);
    if (codeExists) throw new Error("CONFLICT");
  }
  const updated = await updateSupplier(id, data);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function deletePlatformSupplier(id: number) {
  const user = requireUser(await auth());
  if (!canCrossTenant(user)) throw new Error("FORBIDDEN");
  const existing = await getSupplierById(id);
  if (!existing) throw new Error("NOT_FOUND");
  await deleteSupplier(id);
}
