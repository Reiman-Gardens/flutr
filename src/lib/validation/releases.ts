import { z } from "zod";
import { sanitizeText } from "@/lib/validation/sanitize";

const releasedAtSchema = z
  .string({ message: "released_at must be an ISO datetime" })
  .datetime({ message: "released_at must be an ISO datetime" })
  .optional();

const notesSchema = z
  .string()
  .max(2000, "notes is too long")
  .transform((value) => sanitizeText(value))
  .optional();

const createdBySchema = z
  .string()
  .max(200, "created_by is too long")
  .transform((value) => sanitizeText(value))
  .optional();

export const createReleaseFromShipmentSchema = z.object({
  released_at: releasedAtSchema,
  notes: notesSchema,
  created_by: createdBySchema,
});

export type CreateReleaseFromShipmentInput = z.infer<typeof createReleaseFromShipmentSchema>;

export const createInFlightRowSchema = z.object({
  shipment_item_id: z
    .number({ message: "shipment_item_id is required" })
    .int("shipment_item_id must be an integer")
    .positive("shipment_item_id must be positive"),
  quantity: z
    .number({ message: "quantity is required" })
    .int("quantity must be an integer")
    .positive("quantity must be greater than 0"),
});

export type CreateInFlightRowInput = z.infer<typeof createInFlightRowSchema>;

export const updateInFlightQuantitySchema = z.object({
  quantity: z
    .number({ message: "quantity is required" })
    .int("quantity must be an integer")
    .positive("quantity must be greater than 0"),
});

export type UpdateInFlightQuantityInput = z.infer<typeof updateInFlightQuantitySchema>;
