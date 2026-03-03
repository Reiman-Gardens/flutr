import { z } from "zod";

import { sanitizeText } from "@/lib/validation/shared";

export const updateInstitutionBodySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v))
      .optional(),
    street_address: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v))
      .optional(),
    extended_address: z
      .string()
      .max(200)
      .transform((v) => sanitizeText(v))
      .optional(),
    city: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v))
      .optional(),
    state_province: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v))
      .optional(),
    postal_code: z
      .string()
      .min(1)
      .max(30)
      .transform((v) => sanitizeText(v))
      .optional(),
    country: z
      .string()
      .min(1)
      .max(100)
      .transform((v) => sanitizeText(v))
      .optional(),
    phone_number: z
      .string()
      .max(50)
      .transform((v) => sanitizeText(v))
      .optional(),
    email_address: z
      .string()
      .email()
      .transform((v) => sanitizeText(v))
      .optional(),
    website_url: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    facility_image_url: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    logo_url: z
      .string()
      .url()
      .transform((v) => sanitizeText(v))
      .optional(),
    description: z
      .string()
      .max(2000)
      .transform((v) => sanitizeText(v))
      .optional(),
    stats_active: z.boolean().optional(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();
