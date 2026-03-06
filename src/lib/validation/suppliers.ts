import { z } from "zod";

import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";

export const supplierIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const listSuppliersQuerySchema = z
  .object({
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const createSupplierBodySchema = z
  .object({
    name: sanitizedNonEmpty(200),
    code: sanitizedNonEmpty(50),
    country: sanitizedNonEmpty(100),
    website_url: z
      .string()
      .trim()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();
