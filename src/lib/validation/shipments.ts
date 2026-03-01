import { z } from "zod";
import { sanitizeText } from "@/lib/validation/sanitize";

const supplierCodeSchema = z
  .string()
  .min(1, "Supplier code is required")
  .max(20, "Supplier code is too long")
  .transform((value) => sanitizeText(value))
  .refine((value) => value.length > 0, "Supplier code is required");

const shipmentItemSchema = z.object({
  butterflySpeciesId: z
    .number({ message: "Butterfly species is required" })
    .int("Butterfly species must be an integer")
    .positive("Butterfly species must be positive"),
  numberReceived: z
    .number({ message: "Number received is required" })
    .int("Number received must be an integer")
    .min(0, "Number received must be zero or more"),
  emergedInTransit: z
    .number()
    .int("Emerged in transit must be an integer")
    .min(0, "Emerged in transit must be zero or more")
    .default(0),
  damagedInTransit: z
    .number()
    .int("Damaged in transit must be an integer")
    .min(0, "Damaged in transit must be zero or more")
    .default(0),
  diseasedInTransit: z
    .number()
    .int("Diseased in transit must be an integer")
    .min(0, "Diseased in transit must be zero or more")
    .default(0),
  parasite: z
    .number()
    .int("Parasite must be an integer")
    .min(0, "Parasite must be zero or more")
    .default(0),
  nonEmergence: z
    .number()
    .int("Non-emergence must be an integer")
    .min(0, "Non-emergence must be zero or more")
    .default(0),
  poorEmergence: z
    .number()
    .int("Poor emergence must be an integer")
    .min(0, "Poor emergence must be zero or more")
    .default(0),
});

export const createShipmentSchema = z
  .object({
    supplierCode: supplierCodeSchema,
    shipmentDate: z
      .string({ message: "Shipment date is required" })
      .datetime({ message: "Shipment date must be ISO datetime" }),
    arrivalDate: z
      .string({ message: "Arrival date is required" })
      .datetime({ message: "Arrival date must be ISO datetime" }),
    items: z.array(shipmentItemSchema).min(1, "At least one shipment item is required"),
  })
  .superRefine((data, ctx) => {
    const shipmentDate = new Date(data.shipmentDate);
    const arrivalDate = new Date(data.arrivalDate);

    if (!Number.isNaN(shipmentDate.valueOf()) && !Number.isNaN(arrivalDate.valueOf())) {
      if (arrivalDate < shipmentDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Arrival date must be on or after shipment date",
          path: ["arrivalDate"],
        });
      }
    } else {
      if (Number.isNaN(shipmentDate.valueOf())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shipment date must be ISO datetime",
          path: ["shipmentDate"],
        });
      }

      if (Number.isNaN(arrivalDate.valueOf())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Arrival date must be ISO datetime",
          path: ["arrivalDate"],
        });
      }
    }

    const seen = new Set<number>();
    for (const item of data.items) {
      if (seen.has(item.butterflySpeciesId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Butterfly species must be unique per shipment",
          path: ["items"],
        });
        break;
      }
      seen.add(item.butterflySpeciesId);
    }
  });

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const createShipmentWithTenantSchema = createShipmentSchema.extend({
  institutionId: z.number().int().positive().optional(),
});

export type CreateShipmentWithTenantInput = z.infer<typeof createShipmentWithTenantSchema>;

const shipmentItemUpdateSchema = z.object({
  id: z
    .number({ message: "Shipment item id is required" })
    .int("Shipment item id must be an integer")
    .positive("Shipment item id must be positive"),
  numberReceived: z
    .number({ message: "Number received is required" })
    .int("Number received must be an integer")
    .min(0, "Number received must be zero or more"),
  emergedInTransit: z
    .number()
    .int("Emerged in transit must be an integer")
    .min(0, "Emerged in transit must be zero or more"),
  damagedInTransit: z
    .number()
    .int("Damaged in transit must be an integer")
    .min(0, "Damaged in transit must be zero or more"),
  diseasedInTransit: z
    .number()
    .int("Diseased in transit must be an integer")
    .min(0, "Diseased in transit must be zero or more"),
  parasite: z.number().int("Parasite must be an integer").min(0, "Parasite must be zero or more"),
  nonEmergence: z
    .number()
    .int("Non-emergence must be an integer")
    .min(0, "Non-emergence must be zero or more"),
  poorEmergence: z
    .number()
    .int("Poor emergence must be an integer")
    .min(0, "Poor emergence must be zero or more"),
});

export const updateShipmentSchema = z
  .object({
    institutionId: z.number().int().positive().optional(),
    supplierCode: supplierCodeSchema.optional(),
    shipmentDate: z
      .string({ message: "Shipment date must be ISO datetime" })
      .datetime({ message: "Shipment date must be ISO datetime" })
      .optional(),
    arrivalDate: z
      .string({ message: "Arrival date must be ISO datetime" })
      .datetime({ message: "Arrival date must be ISO datetime" })
      .optional(),
    items: z
      .array(shipmentItemUpdateSchema)
      .min(1, "At least one item update is required")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.supplierCode && !data.shipmentDate && !data.arrivalDate && !data.items) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one change is required",
        path: [],
      });
    }

    if (data.shipmentDate && data.arrivalDate) {
      const shipmentDate = new Date(data.shipmentDate);
      const arrivalDate = new Date(data.arrivalDate);
      if (arrivalDate < shipmentDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Arrival date must be on or after shipment date",
          path: ["arrivalDate"],
        });
      }
    }
  });

export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

export const deleteShipmentTenantSchema = z
  .object({
    institutionId: z.number().int().positive().optional(),
  })
  .strict();
