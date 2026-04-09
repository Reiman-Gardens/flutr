import { z } from "zod";

import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";

const speciesFunFactSchema = z
  .object({
    title: sanitizedNonEmpty(120),
    fact: sanitizedNonEmpty(5000),
  })
  .strict();

/**
 * Route param validation
 */
export const speciesIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export type SpeciesIdParams = z.infer<typeof speciesIdParamsSchema>;

/**
 * Platform: Create global species
 */
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
    fun_facts: z.array(speciesFunFactSchema).min(1).optional(),
    img_wings_open: z
      .string()
      .trim()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    img_wings_closed: z
      .string()
      .trim()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    extra_img_1: z
      .string()
      .trim()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    extra_img_2: z
      .string()
      .trim()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
  })
  .strict();

export type CreateSpeciesBody = z.infer<typeof createSpeciesBodySchema>;

/**
 * Platform: Update global species
 *
 * Prevent empty PATCH bodies.
 */
export const updateSpeciesBodySchema = createSpeciesBodySchema
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one change is required",
        path: [],
      });
    }
  });

export type UpdateSpeciesBody = z.infer<typeof updateSpeciesBodySchema>;

/**
 * Tenant: Override species fields for a specific institution.
 *
 * Overrides can also be cleared by sending null.
 * Tenant context is supplied via the x-tenant-slug header — not the request body.
 */
export const updateSpeciesOverrideBodySchema = z
  .object({
    common_name_override: z
      .string()
      .max(200)
      .transform((v) => sanitizeText(v))
      .nullable()
      .optional(),

    lifespan_override: z.coerce.number().int().positive().nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.common_name_override === undefined && data.lifespan_override === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one change is required",
        path: [],
      });
    }
  });

export type UpdateSpeciesOverrideBody = z.infer<typeof updateSpeciesOverrideBodySchema>;
