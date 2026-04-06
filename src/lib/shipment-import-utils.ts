/**
 * Shared types and pure utility functions for the shipment import/export flow.
 * No React dependencies — safe to use in both client components and server-side code.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type SourceKind = "xlsx" | "xls" | "csv" | "tsv" | "txt" | "paste";

export type ShipmentSummaryRow = {
  id: number;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  itemCount: number;
  totalReceived: number;
};

export type PreviewResponse = {
  summary: {
    total_rows: number;
    shipments_detected: number;
    row_errors: number;
    warnings: number;
    unknown_species: number;
    unknown_suppliers: number;
  };
  row_errors: string[];
  warnings: string[];
  unknown_species: string[];
  unknown_suppliers: string[];
  shipments: {
    supplier_code: string;
    shipment_date: string;
    arrival_date: string;
    items: {
      scientific_name: string;
      number_received: number;
      emerged_in_transit: number;
      damaged_in_transit: number;
      diseased_in_transit: number;
      parasite: number;
      non_emergence: number;
      poor_emergence: number;
    }[];
  }[];
  preview_hash: string;
};

export type CommitResponse = {
  created: number;
  failed: number;
  skipped: number;
  failures: string[];
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const REVERSED_RANGE_ERROR = "'From' date must not be after 'To' date";

/** Infer the source kind from a file extension. */
export function detectSourceKind(fileName: string): SourceKind {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".tsv")) return "tsv";
  if (lower.endsWith(".txt")) return "txt";
  return "txt";
}

/** Serialise a 2-D cell array (from an XLSX sheet) to tab-delimited text. */
export function rowsToTabDelimitedText(
  rows: Array<Array<string | number | boolean | null>>,
): string {
  return rows.map((row) => row.map((cell) => String(cell ?? "").trim()).join("\t")).join("\n");
}

/** Read an uploaded file to a plain text string, handling XLSX/XLS via the `xlsx` library. */
export async function readUploadFileAsText(file: File, kind: SourceKind): Promise<string> {
  if (kind === "xlsx" || kind === "xls") {
    const xlsx = await import("xlsx");
    const workbook = xlsx.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Workbook does not contain any sheets.");
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json<Array<string | number | boolean | null>>(firstSheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    return rowsToTabDelimitedText(rows);
  }

  return file.text();
}

/**
 * Format a date string (ISO or YYYY-MM-DD) for display.
 * Uses UTC to prevent date-shifting from timezone offsets.
 */
export function formatShipmentDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Extract the 4-digit year from a date string. */
export function extractYear(dateStr: string): number {
  return new Date(dateStr).getUTCFullYear();
}

/**
 * Filter rows to those whose `shipmentDate` falls within [from, to].
 * Either bound may be omitted (empty string = no bound on that side).
 */
export function filterRowsByDateRange<T extends { shipmentDate: string }>(
  rows: T[],
  from: string,
  to: string,
): T[] {
  return rows.filter((row) => {
    const date = row.shipmentDate.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}
