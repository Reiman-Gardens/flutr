import { z } from "zod";

import { sanitizeText } from "@/lib/validation/shared";

export const releaseIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const shipmentIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const createReleaseBodySchema = z
  .object({
    release_date: z.coerce.date(),
    released_by: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const releaseInFlightParamsSchema = z
  .object({
    releaseId: z.coerce.number().int().positive(),
  })
  .strict();

export const createInFlightBodySchema = z
  .object({
    shipment_item_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();
