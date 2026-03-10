import { z } from "zod";

import { sanitizedNonEmpty } from "@/lib/validation/sanitize";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const scientificNameRegex = /^[A-Za-z0-9_.-]+$/;

export const institutionSlugParamsSchema = z
  .object({
    slug: z.string().min(1).regex(slugRegex),
  })
  .strict();

export const scientificNameParamsSchema = z
  .object({
    scientific_name: z.string().min(1).regex(scientificNameRegex),
  })
  .strict();

export const publicEmptyQuerySchema = z.object({}).strict();

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
