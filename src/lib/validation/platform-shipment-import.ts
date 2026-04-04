import { z } from "zod";

const isoDateTimeSchema = z.string().datetime();

export const importSourceSchema = z
  .object({
    kind: z.enum(["xlsx", "xls", "csv", "tsv", "txt", "paste"]),
    file_name: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const shipmentImportPreviewRequestSchema = z
  .object({
    raw_text: z.string().min(1).max(2_000_000),
    source: importSourceSchema,
  })
  .strict();

const shipmentImportDraftItemSchema = z
  .object({
    scientific_name: z.string().trim().min(1).max(200),
    number_received: z.number().int().min(0),
    emerged_in_transit: z.number().int().min(0),
    damaged_in_transit: z.number().int().min(0),
    diseased_in_transit: z.number().int().min(0),
    parasite: z.number().int().min(0),
    non_emergence: z.number().int().min(0),
    poor_emergence: z.number().int().min(0),
  })
  .strict();

export const shipmentImportDraftSchema = z
  .object({
    supplier_code: z.string().trim().min(1).max(50),
    shipment_date: isoDateTimeSchema,
    arrival_date: isoDateTimeSchema,
    items: z.array(shipmentImportDraftItemSchema).min(1),
  })
  .strict();

export const shipmentImportPreviewResponseSchema = z
  .object({
    summary: z
      .object({
        total_rows: z.number().int().min(0),
        shipments_detected: z.number().int().min(0),
        row_errors: z.number().int().min(0),
        warnings: z.number().int().min(0),
        unknown_species: z.number().int().min(0),
        unknown_suppliers: z.number().int().min(0),
      })
      .strict(),
    row_errors: z.array(z.string().min(1)),
    warnings: z.array(z.string().min(1)),
    unknown_species: z.array(z.string().min(1)),
    unknown_suppliers: z.array(z.string().min(1)),
    shipments: z.array(shipmentImportDraftSchema),
    preview_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict();

export const shipmentImportCommitOptionsSchema = z
  .object({
    allow_species_autocreate: z.boolean().optional(),
    allow_duplicate_headers: z.boolean().optional(),
  })
  .strict();

export const shipmentImportCommitRequestSchema = z
  .object({
    preview_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    shipments: z.array(shipmentImportDraftSchema).min(1),
    options: shipmentImportCommitOptionsSchema.optional(),
  })
  .strict();

export const shipmentImportCommitResponseSchema = z
  .object({
    created: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0),
    failures: z.array(z.string().min(1)),
    warnings: z.array(z.string().min(1)),
  })
  .strict();

export const shipmentExportQuerySchema = z
  .object({
    format: z.enum(["xlsx", "csv"]).optional(),
  })
  .strict();

export type ShipmentImportPreviewRequest = z.infer<typeof shipmentImportPreviewRequestSchema>;
export type ShipmentImportDraft = z.infer<typeof shipmentImportDraftSchema>;
export type ShipmentImportPreviewResponse = z.infer<typeof shipmentImportPreviewResponseSchema>;
export type ShipmentImportCommitRequest = z.infer<typeof shipmentImportCommitRequestSchema>;
export type ShipmentImportCommitResponse = z.infer<typeof shipmentImportCommitResponseSchema>;
export type ShipmentExportQuery = z.infer<typeof shipmentExportQuerySchema>;
