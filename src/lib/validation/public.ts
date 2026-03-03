import { z } from "zod";

import { sanitizeText } from "@/lib/validation/shared";

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

export const publicInstitutionQuerySchema = z.object({}).strict();

export const publicTextFilterSchema = z
  .object({
    q: z
      .string()
      .min(1)
      .max(200)
      .transform((value) => sanitizeText(value))
      .optional(),
  })
  .strict();
