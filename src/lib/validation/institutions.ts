import { z } from "zod";

import { sanitizeText } from "@/lib/validation/shared";

export const platformInstitutionIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const createInstitutionBodySchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v)),
    name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    street_address: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    extended_address: z
      .string()
      .max(200)
      .transform((v) => sanitizeText(v))
      .optional(),
    city: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v)),
    state_province: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v)),
    postal_code: z
      .string()
      .min(1)
      .max(30)
      .transform((v) => sanitizeText(v)),
    country: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v)),
    iabes_member: z.boolean().optional(),
    stats_active: z.boolean().optional(),
  })
  .strict();

export const updateInstitutionBodySchema = createInstitutionBodySchema.partial().strict();
