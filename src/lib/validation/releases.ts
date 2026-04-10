import { z } from "zod";

const releaseItemSchema = z
  .object({
    shipment_item_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
  })
  .strict();

/**
 * Loss-column corrections that can be applied atomically alongside a release
 * POST. Each row carries absolute new values for any loss columns the client
 * wants to adjust; omitted columns are left unchanged. The same transaction
 * that creates the release event also writes these updates, so the
 * "remaining" check is computed against the post-correction inventory.
 */
const releaseLossUpdateSchema = z
  .object({
    shipment_item_id: z.coerce.number().int().positive(),
    damaged_in_transit: z.coerce.number().int().nonnegative().optional(),
    diseased_in_transit: z.coerce.number().int().nonnegative().optional(),
    parasite: z.coerce.number().int().nonnegative().optional(),
    non_emergence: z.coerce.number().int().nonnegative().optional(),
    poor_emergence: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export const createReleaseFromShipmentSchema = z
  .object({
    released_at: z.coerce.date().optional(),
    items: z.array(releaseItemSchema).min(1, "At least one release item is required"),
    loss_updates: z.array(releaseLossUpdateSchema).optional().default([]),
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

    const lossSeen = new Set<number>();
    for (const row of data.loss_updates ?? []) {
      if (lossSeen.has(row.shipment_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shipment items must be unique in loss_updates",
          path: ["loss_updates"],
        });
        break;
      }
      lossSeen.add(row.shipment_item_id);
    }
  });

export type ReleaseLossUpdate = z.infer<typeof releaseLossUpdateSchema>;

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

/**
 * Query schema for `GET /api/tenant/releases`. Mirrors the shipments list
 * pagination contract so the UI can rely on a consistent shape.
 */
export const listReleasesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  })
  .strict();

export type ListReleasesQuery = z.infer<typeof listReleasesQuerySchema>;
