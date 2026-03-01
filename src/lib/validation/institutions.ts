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

const emailField = nullableOptionalTextField(320)
  .transform((value) => (value != null && value.length === 0 ? null : value))
  .refine(
    (value) => value == null || z.string().email().safeParse(value).success,
    "Email is invalid",
  );

const institutionFields = {
  slug: slugSchema,
  name: requiredTextField("Name", 200),
  street_address: requiredTextField("Street address", 300),
  extended_address: nullableOptionalTextField(300),
  city: requiredTextField("City", 200),
  state_province: requiredTextField("State/Province", 200),
  postal_code: requiredTextField("Postal code", 50),
  time_zone: nullableOptionalTextField(100),
  country: requiredTextField("Country", 200),
  phone_number: nullableOptionalTextField(50),
  email_address: emailField,
  iabes_member: z.boolean().optional(),
  theme_colors: z.array(z.string().max(50, "Theme color is too long")).optional(),
  website_url: nullableOptionalTextField(500),
  facility_image_url: nullableOptionalTextField(1000),
  logo_url: nullableOptionalTextField(1000),
  description: nullableOptionalTextField(5000),
  social_links: z.record(z.string(), z.unknown()).optional(),
  stats_active: z.boolean().optional(),
};

export const createInstitutionSchema = z.object(institutionFields).strict();

export const updateInstitutionSchema = z
  .object({
    slug: institutionFields.slug.optional(),
    name: institutionFields.name.optional(),
    street_address: institutionFields.street_address.optional(),
    extended_address: institutionFields.extended_address,
    city: institutionFields.city.optional(),
    state_province: institutionFields.state_province.optional(),
    postal_code: institutionFields.postal_code.optional(),
    time_zone: institutionFields.time_zone,
    country: institutionFields.country.optional(),
    phone_number: institutionFields.phone_number,
    email_address: institutionFields.email_address,
    iabes_member: institutionFields.iabes_member,
    theme_colors: institutionFields.theme_colors,
    website_url: institutionFields.website_url,
    facility_image_url: institutionFields.facility_image_url,
    logo_url: institutionFields.logo_url,
    description: institutionFields.description,
    social_links: institutionFields.social_links,
    stats_active: institutionFields.stats_active,
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

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;
