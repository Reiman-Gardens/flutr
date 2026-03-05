import { z } from "zod";

import { sanitizeText } from "@/lib/validation/sanitize";

export const shipmentIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const createShipmentBodySchema = z
  .object({
    supplier_code: z
      .string()
      .min(1)
      .max(50)
      .transform((v) => sanitizeText(v)),
    shipment_date: z.coerce.date(),
    arrival_date: z.coerce.date(),
    items: z
      .array(
        z
          .object({
            butterfly_species_id: z.coerce.number().int().positive(),
            number_received: z.coerce.number().int().nonnegative(),
            emerged_in_transit: z.coerce.number().int().nonnegative().optional(),
            damaged_in_transit: z.coerce.number().int().nonnegative().optional(),
            diseased_in_transit: z.coerce.number().int().nonnegative().optional(),
            parasite: z.coerce.number().int().nonnegative().optional(),
            non_emergence: z.coerce.number().int().nonnegative().optional(),
            poor_emergence: z.coerce.number().int().nonnegative().optional(),
          })
          .strict(),
      )
      .min(1),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const listShipmentsQuerySchema = z
  .object({ institutionId: z.coerce.number().int().positive().optional() })
  .strict();

export const updateShipmentBodySchema = createShipmentBodySchema.partial().strict();
