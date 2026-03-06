import { z } from "zod";

import { sanitizedNonEmpty } from "@/lib/validation/sanitize";

export const createReleaseBodySchema = z
  .object({
    release_date: z.coerce.date(),
    released_by: sanitizedNonEmpty(200),
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
