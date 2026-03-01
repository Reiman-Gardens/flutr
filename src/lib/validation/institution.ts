import { z } from "zod";
import { sanitizeText } from "@/lib/validation/sanitize";

const slugSchema = z
  .string({ message: "Slug is required" })
  .min(1, "Slug is required")
  .max(100, "Slug is too long")
  .transform((value) => sanitizeText(value).toLowerCase())
  .refine((value) => value.length > 0, "Slug is required")
  .refine(
    (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    "Slug must contain only lowercase letters, numbers, and hyphens",
  );

export const getInstitutionBySlugSchema = z.object({
  slug: slugSchema,
});

export type GetInstitutionBySlugInput = z.infer<typeof getInstitutionBySlugSchema>;

const scientificNameSchema = z
  .string({ message: "Scientific name is required" })
  .min(1, "Scientific name is required")
  .max(200, "Scientific name is too long")
  .transform((value) => sanitizeText(value))
  .refine((value) => value.length > 0, "Scientific name is required");

export const getInstitutionSpeciesDetailParamsSchema = z.object({
  slug: slugSchema,
  scientific_name: scientificNameSchema,
});

export type GetInstitutionSpeciesDetailParamsInput = z.infer<
  typeof getInstitutionSpeciesDetailParamsSchema
>;

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

export const updateInstitutionProfileSchema = z
  .object({
    name: requiredTextField("Name", 200).optional(),
    street_address: requiredTextField("Street address", 300).optional(),
    extended_address: nullableOptionalTextField(300),
    city: requiredTextField("City", 200).optional(),
    state_province: requiredTextField("State/Province", 200).optional(),
    postal_code: requiredTextField("Postal code", 50).optional(),
    time_zone: nullableOptionalTextField(100),
    country: requiredTextField("Country", 200).optional(),
    phone_number: nullableOptionalTextField(50),
    email_address: nullableOptionalTextField(320)
      .transform((value) => (value != null && value.length === 0 ? null : value))
      .refine(
        (value) => value == null || z.string().email().safeParse(value).success,
        "Email is invalid",
      ),
    iabes_member: z.boolean().optional(),
    theme_colors: z.array(z.string().max(50, "Theme color is too long")).optional(),
    website_url: nullableOptionalTextField(500),
    facility_image_url: nullableOptionalTextField(1000),
    logo_url: nullableOptionalTextField(1000),
    description: nullableOptionalTextField(5000),
    social_links: z.record(z.string(), z.unknown()).optional(),
    stats_active: z.boolean().optional(),
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

export type UpdateInstitutionProfileInput = z.infer<typeof updateInstitutionProfileSchema>;
