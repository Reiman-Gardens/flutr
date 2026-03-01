import { z } from "zod";
import { sanitizeText } from "@/lib/validation/sanitize";

const requiredTextField = (label: string, max: number) =>
  z
    .string({ message: `${label} is required` })
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`)
    .transform((value) => sanitizeText(value))
    .refine((value) => value.length > 0, `${label} is required`);

const nullableOptionalTextField = (max: number) =>
  z
    .string()
    .max(max, "Value is too long")
    .transform((value) => sanitizeText(value))
    .nullable()
    .optional();

const stringArrayField = (label: string, maxItems = 200, maxItemLength = 200) =>
  z
    .array(
      z
        .string({ message: `${label} entry is required` })
        .min(1, `${label} entry is required`)
        .max(maxItemLength, `${label} entry is too long`)
        .transform((value) => sanitizeText(value))
        .refine((value) => value.length > 0, `${label} entry is required`),
    )
    .max(maxItems, `${label} is too long`);

const scientificNameSchema = requiredTextField("Scientific name", 200);

const speciesFields = {
  scientific_name: scientificNameSchema,
  common_name: requiredTextField("Common name", 200),
  family: requiredTextField("Family", 200),
  sub_family: requiredTextField("Sub-family", 200),
  lifespan_days: z
    .number({ message: "Lifespan days is required" })
    .int("Lifespan days must be an integer")
    .positive("Lifespan days must be positive"),
  range: stringArrayField("Range"),
  description: nullableOptionalTextField(5000),
  host_plant: nullableOptionalTextField(1000),
  habitat: nullableOptionalTextField(1000),
  fun_facts: nullableOptionalTextField(5000),
  img_wings_open: nullableOptionalTextField(1000),
  img_wings_closed: nullableOptionalTextField(1000),
  extra_img_1: nullableOptionalTextField(1000),
  extra_img_2: nullableOptionalTextField(1000),
};

export const createSpeciesSchema = z.object(speciesFields).strict();

export const updateSpeciesSchema = z
  .object({
    scientific_name: speciesFields.scientific_name.optional(),
    common_name: speciesFields.common_name.optional(),
    family: speciesFields.family.optional(),
    sub_family: speciesFields.sub_family.optional(),
    lifespan_days: speciesFields.lifespan_days.optional(),
    range: speciesFields.range.optional(),
    description: speciesFields.description,
    host_plant: speciesFields.host_plant,
    habitat: speciesFields.habitat,
    fun_facts: speciesFields.fun_facts,
    img_wings_open: speciesFields.img_wings_open,
    img_wings_closed: speciesFields.img_wings_closed,
    extra_img_1: speciesFields.extra_img_1,
    extra_img_2: speciesFields.extra_img_2,
  })
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

export const speciesIdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int("Species id must be an integer")
    .positive("Species id must be positive"),
});

export type CreateSpeciesInput = z.infer<typeof createSpeciesSchema>;
export type UpdateSpeciesInput = z.infer<typeof updateSpeciesSchema>;
export type SpeciesIdParamsInput = z.infer<typeof speciesIdParamsSchema>;
