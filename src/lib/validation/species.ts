import { z } from "zod";

import { sanitizeText } from "@/lib/validation/sanitize";

export const speciesIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const createSpeciesBodySchema = z
  .object({
    scientific_name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    common_name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    family: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    sub_family: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    lifespan_days: z.coerce.number().int().positive(),
    range: z
      .array(
        z
          .string()
          .min(1)
          .transform((v) => sanitizeText(v)),
      )
      .min(1),
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
