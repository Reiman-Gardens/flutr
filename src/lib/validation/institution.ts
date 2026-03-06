import { z } from "zod";
import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";

/**
 * This file defines Zod schemas for validating institution-related data across the platform.
 * It includes:
 * 1. Parameter schemas for route parameters (e.g., institution ID, slug)
 * 2. Base field definitions for institution data (used in both platform and tenant schemas)
 * 3. Separate schemas for platform-level operations (superusers) and tenant-level operations (institution admins)
 * 4. Inferred TypeScript types for service layer inputs
 *
 * The goal is to have a single source of truth for institution data validation, ensuring consistency and security across the application.
 */
export const platformInstitutionIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

// ----------------------------------------------------------------------
// 2. BASE SCHEMA (The single source of truth for institution fields)
// ----------------------------------------------------------------------
const baseInstitutionFields = {
  name: sanitizedNonEmpty(200),
  street_address: sanitizedNonEmpty(200),
  extended_address: z.string().max(200).transform(sanitizeText).optional(),
  city: sanitizedNonEmpty(100),
  state_province: sanitizedNonEmpty(100),
  postal_code: sanitizedNonEmpty(30),
  country: sanitizedNonEmpty(100),
  phone_number: z.string().max(50).transform(sanitizeText).optional(),
  email_address: z.string().email().transform(sanitizeText).optional(),
  website_url: z.string().url().transform(sanitizeText).optional(),
  facility_image_url: z.string().url().transform(sanitizeText).optional(),
  logo_url: z.string().url().transform(sanitizeText).optional(),
  description: z.string().max(2000).transform(sanitizeText).optional(),
};

// ----------------------------------------------------------------------
// 3. PLATFORM SCHEMAS (Superusers only)
// ----------------------------------------------------------------------
export const platformCreateInstitutionSchema = z
  .object({
    ...baseInstitutionFields,
    // Superusers define the slug on creation
    slug: sanitizedNonEmpty(100),
    iabes_member: z.boolean().optional(),
    stats_active: z.boolean().optional(),
  })
  .strict();

export const platformUpdateInstitutionSchema = platformCreateInstitutionSchema.partial().strict();

// ----------------------------------------------------------------------
// 4. TENANT SCHEMAS (Admins updating their own stuff)
// ----------------------------------------------------------------------
// - No `institutionId` (derived securely from session)
// - No `slug` (Tenants cannot change their own URL structure)
// - No `iabes_member` (Only Superusers verify this)
export const tenantUpdateInstitutionSchema = z
  .object({
    ...baseInstitutionFields,
    // Optional: Decide if tenants can toggle their own public visibility
    stats_active: z.boolean().optional(),
  })
  .partial()
  .strict();

// ----------------------------------------------------------------------
// INFERRED TYPES FOR SERVICES
// ----------------------------------------------------------------------
export type PlatformCreateInstitutionInput = z.infer<typeof platformCreateInstitutionSchema>;
export type PlatformUpdateInstitutionInput = z.infer<typeof platformUpdateInstitutionSchema>;
export type TenantUpdateInstitutionInput = z.infer<typeof tenantUpdateInstitutionSchema>;
