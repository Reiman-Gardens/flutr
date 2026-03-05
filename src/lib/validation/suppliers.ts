import { z } from "zod";

import { sanitizeText } from "@/lib/validation/sanitize";

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
    name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    code: z
      .string()
      .min(1)
      .max(50)
      .transform((v) => sanitizeText(v)),
    country: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v)),
    website_url: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();
