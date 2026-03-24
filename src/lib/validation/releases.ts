import { z } from "zod";

const releaseItemSchema = z
  .object({
    shipment_item_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
  })
  .strict();

export const createReleaseFromShipmentSchema = z
  .object({
    released_at: z.coerce.date().optional(),
    items: z.array(releaseItemSchema).min(1, "At least one release item is required"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<number>();

    for (const item of data.items) {
      if (seen.has(item.shipment_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shipment items must be unique in a release request",
          path: ["items"],
        });
        break;
      }

      seen.add(item.shipment_item_id);
    }
  });

export type CreateReleaseFromShipmentBody = z.infer<typeof createReleaseFromShipmentSchema>;

export const updateInFlightQuantitySchema = z
  .object({
    quantity: z.coerce.number().int().positive(),
  })
  .strict();

export type UpdateInFlightQuantityBody = z.infer<typeof updateInFlightQuantitySchema>;

// Backwards-compatible alias for existing scaffold route imports.
export const createReleaseBodySchema = createReleaseFromShipmentSchema;

export const releaseInFlightParamsSchema = z
  .object({
    releaseId: z.coerce.number().int().positive(),
  })
  .strict();

export const createInFlightBodySchema = z
  .object({
    shipment_item_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
  })
  .strict();

export type CreateInFlightBody = z.infer<typeof createInFlightBodySchema>;

export const updateReleaseEventItemsSchema = z
  .object({
    items: z.array(releaseItemSchema).min(1, "At least one release item is required"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<number>();

    for (const item of data.items) {
      if (seen.has(item.shipment_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shipment items must be unique in a release request",
          path: ["items"],
        });
        break;
      }

      seen.add(item.shipment_item_id);
    }
  });

export type UpdateReleaseEventItemsBody = z.infer<typeof updateReleaseEventItemsSchema>;
