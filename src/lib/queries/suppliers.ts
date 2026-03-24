import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { suppliers } from "@/lib/schema";

import type { CreateSupplierBody, UpdateSupplierBody } from "@/lib/validation/suppliers";

export const SUPPLIER_ERRORS = {
  REFERENCED_BY_SHIPMENTS: "Supplier is referenced by existing shipments",
} as const;

/**
 * TENANT QUERY
 *
 * List all suppliers for a tenant.
 */
export async function listSuppliersForTenant(institutionId: number) {
  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      code: suppliers.code,
      country: suppliers.country,
      websiteUrl: suppliers.website_url,
      isActive: suppliers.is_active,
      createdAt: suppliers.created_at,
    })
    .from(suppliers)
    .where(eq(suppliers.institution_id, institutionId))
    .orderBy(suppliers.name);
}

/**
 * PLATFORM QUERY
 *
 * List all suppliers, optionally filtered by institution.
 */
export async function listSuppliersForPlatform(institutionId?: number) {
  const condition = institutionId ? eq(suppliers.institution_id, institutionId) : undefined;

  return db
    .select({
      id: suppliers.id,
      institutionId: suppliers.institution_id,
      name: suppliers.name,
      code: suppliers.code,
      country: suppliers.country,
      websiteUrl: suppliers.website_url,
      isActive: suppliers.is_active,
      createdAt: suppliers.created_at,
    })
    .from(suppliers)
    .where(condition)
    .orderBy(desc(suppliers.created_at));
}

/**
 * Fetch a single supplier by ID.
 */
export async function getSupplierById(supplierId: number) {
  const [row] = await db
    .select({
      id: suppliers.id,
      institutionId: suppliers.institution_id,
      name: suppliers.name,
      code: suppliers.code,
      country: suppliers.country,
      websiteUrl: suppliers.website_url,
      isActive: suppliers.is_active,
      createdAt: suppliers.created_at,
    })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  return row ?? null;
}

/**
 * Check if a supplier code already exists for a given institution.
 * Optionally exclude a supplier ID (for update uniqueness checks).
 */
export async function supplierCodeExistsForTenant(
  institutionId: number,
  code: string,
  excludeId?: number,
) {
  const conditions = excludeId
    ? and(
        eq(suppliers.institution_id, institutionId),
        eq(suppliers.code, code),
        ne(suppliers.id, excludeId),
      )
    : and(eq(suppliers.institution_id, institutionId), eq(suppliers.code, code));

  const [row] = await db.select({ id: suppliers.id }).from(suppliers).where(conditions).limit(1);

  return !!row;
}

/**
 * PLATFORM QUERY
 *
 * Create a new supplier for a given institution.
 */
export async function createSupplier(institutionId: number, input: CreateSupplierBody) {
  const [row] = await db
    .insert(suppliers)
    .values({
      institution_id: institutionId,
      name: input.name,
      code: input.code,
      country: input.country,
      website_url: input.website_url ?? null,
      is_active: input.is_active ?? true,
    })
    .returning({
      id: suppliers.id,
      institutionId: suppliers.institution_id,
      name: suppliers.name,
      code: suppliers.code,
      country: suppliers.country,
      websiteUrl: suppliers.website_url,
      isActive: suppliers.is_active,
      createdAt: suppliers.created_at,
    });

  return row;
}

/**
 * PLATFORM QUERY
 *
 * Update a supplier by ID.
 */
export async function updateSupplier(supplierId: number, input: UpdateSupplierBody) {
  const updateData: Record<string, unknown> = { updated_at: new Date() };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.website_url !== undefined) updateData.website_url = input.website_url;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  try {
    const [row] = await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, supplierId))
      .returning({
        id: suppliers.id,
        institutionId: suppliers.institution_id,
        name: suppliers.name,
        code: suppliers.code,
        country: suppliers.country,
        websiteUrl: suppliers.website_url,
        isActive: suppliers.is_active,
        createdAt: suppliers.created_at,
      });

    return row ?? null;
  } catch (error: unknown) {
    if (isForeignKeyViolation(error)) {
      throw new Error(SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS);
    }
    throw error;
  }
}

/**
 * PLATFORM QUERY
 *
 * Delete a supplier by ID.
 * Throws SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS if FK constraint prevents deletion.
 */
export async function deleteSupplier(supplierId: number) {
  try {
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, supplierId))
      .returning({ id: suppliers.id });

    return result.length > 0;
  } catch (error: unknown) {
    if (isForeignKeyViolation(error)) {
      throw new Error(SUPPLIER_ERRORS.REFERENCED_BY_SHIPMENTS);
    }
    throw error;
  }
}

/**
 * Detect PostgreSQL foreign key violation (error code 23503).
 */
function isForeignKeyViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}

/**
 * PLATFORM QUERY
 *
 * Ensure a supplier with the given code exists for the tenant, creating it if necessary.
 * Used by the importer to link shipments to suppliers without requiring pre-creation.
 * Returns the existing or newly created supplier's ID and code.
 */
export async function ensureSupplierExistsForTenant(
  tenantId: number,
  code: string,
  fallbackData?: {
    name?: string;
    country?: string;
    websiteUrl?: string | null;
  },
) {
  const normalizedCode = code.toUpperCase();

  const [existing] = await db
    .select({
      id: suppliers.id,
      code: suppliers.code,
    })
    .from(suppliers)
    .where(and(eq(suppliers.institution_id, tenantId), eq(suppliers.code, normalizedCode)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(suppliers)
    .values({
      institution_id: tenantId,
      code: normalizedCode,
      name: fallbackData?.name ?? normalizedCode,
      country: fallbackData?.country ?? "Unknown",
      website_url: fallbackData?.websiteUrl ?? null,
      is_active: false, // important for importer
    })
    .returning({
      id: suppliers.id,
      code: suppliers.code,
    });

  return created;
}
