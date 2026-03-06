import { z } from "zod";

import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";

export const speciesIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const createSpeciesBodySchema = z
  .object({
    scientific_name: sanitizedNonEmpty(200),
    common_name: sanitizedNonEmpty(200),
    family: sanitizedNonEmpty(200),
    sub_family: sanitizedNonEmpty(200),
    lifespan_days: z.coerce.number().int().positive(),
    range: z.array(sanitizedNonEmpty(200)).min(1),
    description: z
      .string()
      .max(5000)
      .transform((v) => sanitizeText(v))
      .optional(),
    host_plant: z
      .string()
      .max(500)
      .transform((v) => sanitizeText(v))
      .optional(),
    habitat: z
      .string()
      .max(500)
      .transform((v) => sanitizeText(v))
      .optional(),
    fun_facts: z
      .string()
      .max(5000)
      .transform((v) => sanitizeText(v))
      .optional(),
    img_wings_open: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    img_wings_closed: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    extra_img_1: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    extra_img_2: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
  })
  .strict();

export const updateSpeciesBodySchema = createSpeciesBodySchema.partial().strict();
