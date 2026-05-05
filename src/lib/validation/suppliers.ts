import { z } from "zod";

import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";

export const supplierWebsiteSchema = z
  .string()
  .trim()
  .max(300)
  .refine((value) => isValidSupplierWebsite(value), {
    message: "Enter a valid website",
  })
  .transform((v) => sanitizeText(v));

function isValidSupplierWebsite(value: string) {
  if (!value || /\s/.test(value)) return false;

  const candidate = /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * ---------------------------
 * Params: Supplier ID
 * /platform/suppliers/[id]
 * ---------------------------
 */

export const supplierIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

/**
 * ---------------------------
 * Query: List Suppliers (Platform)
 * GET /platform/suppliers
 * ---------------------------
 */

export const listSuppliersQuerySchema = z.object({}).strict();

/**
 * ---------------------------
 * Create Supplier
 * POST /platform/suppliers
 * ---------------------------
 */

export const createSupplierBodySchema = z
  .object({
    name: sanitizedNonEmpty(200),
    code: sanitizedNonEmpty(50),
    country: sanitizedNonEmpty(100),
    website_url: supplierWebsiteSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export type CreateSupplierBody = z.infer<typeof createSupplierBodySchema>;

/**
 * ---------------------------
 * Update Supplier
 * PATCH /platform/suppliers/[id]
 * ---------------------------
 */

export const updateSupplierBodySchema = z
  .object({
    name: sanitizedNonEmpty(200).optional(),
    code: sanitizedNonEmpty(50).optional(),
    country: sanitizedNonEmpty(100).optional(),
    website_url: supplierWebsiteSchema.nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.name === undefined &&
      data.code === undefined &&
      data.country === undefined &&
      data.website_url === undefined &&
      data.is_active === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  });

export type UpdateSupplierBody = z.infer<typeof updateSupplierBodySchema>;
