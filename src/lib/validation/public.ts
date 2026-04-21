import { z } from "zod";

import { sanitizedNonEmpty } from "@/lib/validation/sanitize";
import { institutionSlugSchema } from "@/lib/validation/slug";

const scientificNameRegex = /^[A-Za-z0-9_.-]+$/;
const PUBLIC_INSTITUTIONS_MAX_LIMIT = 100;

export const institutionSlugParamsSchema = z
  .object({
    slug: institutionSlugSchema,
  })
  .strict();

export const scientificNameParamsSchema = z
  .object({
    scientific_name: z.string().min(1).regex(scientificNameRegex),
  })
  .strict();

export const publicEmptyQuerySchema = z.object({}).strict();

export const publicInstitutionsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .default(50)
      .transform((value) => Math.min(value, PUBLIC_INSTITUTIONS_MAX_LIMIT)),
  })
  .strict();

export const publicTextFilterSchema = z
  .object({
    q: sanitizedNonEmpty(200).optional(),
  })
  .strict();

export const institutionSpeciesDetailParamsSchema = z
  .object({
    slug: institutionSlugParamsSchema.shape.slug,
    scientific_name: scientificNameParamsSchema.shape.scientific_name,
  })
  .strict();
