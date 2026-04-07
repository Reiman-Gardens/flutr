export type ShipmentImportHeaderKey =
  | "species"
  | "supplier"
  | "shipDate"
  | "arrivalDate"
  | "numberReceived"
  | "emergedInTransit"
  | "damagedInTransit"
  | "diseasedInTransit"
  | "parasite"
  | "nonEmergence"
  | "poorEmergence";

export interface ParsedShipmentImportRow {
  rowNumber: number;
  scientificName: string;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  numberReceived: number;
  emergedInTransit: number;
  damagedInTransit: number;
  diseasedInTransit: number;
  parasite: number;
  nonEmergence: number;
  poorEmergence: number;
}

export interface ParsedShipmentImportResult {
  rows: ParsedShipmentImportRow[];
  rowErrors: string[];
  warnings: string[];
}

export interface ShipmentImportDraftItem {
  scientific_name: string;
  number_received: number;
  emerged_in_transit: number;
  damaged_in_transit: number;
  diseased_in_transit: number;
  parasite: number;
  non_emergence: number;
  poor_emergence: number;
}

export interface ShipmentImportDraft {
  supplier_code: string;
  shipment_date: string;
  arrival_date: string;
  items: ShipmentImportDraftItem[];
}

const METRIC_COLUMNS = [
  "emergedInTransit",
  "damagedInTransit",
  "diseasedInTransit",
  "parasite",
  "nonEmergence",
  "poorEmergence",
] as const satisfies readonly ShipmentImportHeaderKey[];

const METRIC_COLUMN_LABELS: Record<(typeof METRIC_COLUMNS)[number], string> = {
  emergedInTransit: "Emerg. in tr",
  damagedInTransit: "Damag in tr",
  diseasedInTransit: "No. disea",
  parasite: "No. parasit",
  nonEmergence: "No emerg",
  poorEmergence: "Poor emerg",
};

export function normalizeScientificName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSupplierCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function detectShipmentImportHeaderKey(header: string): ShipmentImportHeaderKey | null {
  const normalized = normalizeHeader(header);

  if (normalized === "species") return "species";
  if (normalized === "supplier") return "supplier";
  if (normalized === "ship date" || normalized === "shipment date") return "shipDate";
  if (normalized === "arrival date") return "arrivalDate";
  if (
    normalized === "no rec" ||
    normalized === "number rec" ||
    normalized === "number received" ||
    normalized === "no received"
  ) {
    return "numberReceived";
  }

  if (normalized.startsWith("emerg")) return "emergedInTransit";
  if (normalized.startsWith("damag")) return "damagedInTransit";
  if (normalized.startsWith("no disea") || normalized.startsWith("disea")) {
    return "diseasedInTransit";
  }

  if (normalized.startsWith("no parasit") || normalized.startsWith("parasit")) {
    return "parasite";
  }

  if (normalized === "no emerg" || normalized === "non emergence" || normalized === "non emerg") {
    return "nonEmergence";
  }

  if (normalized.startsWith("poor emerg")) return "poorEmergence";

  return null;
}

export function parseNonNegativeInteger(value: string, { required }: { required: boolean }) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return required ? null : 0;
  }

  const parsed = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  if (!Number.isInteger(parsed) || parsed < 0) return null;

  return parsed;
}

function toUtcNoonIso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

export function parseExcelDateToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number.parseFloat(trimmed);
    if (!Number.isFinite(serial) || serial <= 0) return null;

    const millis = Math.round((serial - 25569) * 24 * 60 * 60 * 1000);
    const date = new Date(millis);
    if (Number.isNaN(date.valueOf())) return null;

    return toUtcNoonIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const month = Number.parseInt(match[1], 10);
    const day = Number.parseInt(match[2], 10);
    const rawYear = Number.parseInt(match[3], 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;

    const validated = new Date(Date.UTC(year, month - 1, day));
    if (
      validated.getUTCFullYear() !== year ||
      validated.getUTCMonth() + 1 !== month ||
      validated.getUTCDate() !== day
    ) {
      return null;
    }

    return toUtcNoonIso(year, month, day);
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.valueOf())) return null;

  return toUtcNoonIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function parseShipmentImportRows(rawText: string): ParsedShipmentImportResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      rowErrors: ["Provide a header row and at least one data row."],
      warnings: [],
    };
  }

  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const delimiter = headerLine.split("\t").length >= headerLine.split(",").length ? "\t" : ",";
  const headerCells = splitDelimitedLine(headerLine, delimiter);

  const indices: Partial<Record<ShipmentImportHeaderKey, number>> = {};
  headerCells.forEach((headerCell, index) => {
    const key = detectShipmentImportHeaderKey(headerCell);
    if (key && indices[key] == null) {
      indices[key] = index;
    }
  });

  const requiredColumns: ShipmentImportHeaderKey[] = [
    "species",
    "supplier",
    "shipDate",
    "arrivalDate",
    "numberReceived",
  ];

  const missingColumns = requiredColumns.filter((column) => indices[column] == null);
  if (missingColumns.length > 0) {
    return {
      rows: [],
      rowErrors: [
        `Missing required columns: ${missingColumns.join(", ")}.`,
        "Expected headers similar to: Species, No. rec, Supplier, Ship date, Arrival date.",
      ],
      warnings: [],
    };
  }

  const warnings: string[] = [];

  const missingMetricColumns = METRIC_COLUMNS.filter((column) => indices[column] == null);
  if (missingMetricColumns.length > 0) {
    const labels = missingMetricColumns.map((column) => METRIC_COLUMN_LABELS[column]).join(", ");
    warnings.push(
      `Missing metric columns (${labels}). Values in these columns will default to 0 for each imported row.`,
    );
  }

  const getCellValue = (cells: string[], key: ShipmentImportHeaderKey) => {
    const index = indices[key];
    if (index == null) return "";
    return cells[index] ?? "";
  };

  const rows: ParsedShipmentImportRow[] = [];
  const rowErrors: string[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = splitDelimitedLine(lines[lineIndex], delimiter);
    const rowNumber = lineIndex + 1;

    const scientificName = normalizeScientificName(getCellValue(cells, "species"));
    const supplierCode = normalizeSupplierCode(getCellValue(cells, "supplier"));
    const shipmentDate = parseExcelDateToIso(getCellValue(cells, "shipDate"));
    const arrivalDate = parseExcelDateToIso(getCellValue(cells, "arrivalDate"));

    const numberReceivedRaw = getCellValue(cells, "numberReceived");
    const numberReceived = parseNonNegativeInteger(numberReceivedRaw, {
      required: false,
    });
    const emergedInTransit = parseNonNegativeInteger(getCellValue(cells, "emergedInTransit"), {
      required: false,
    });
    const damagedInTransit = parseNonNegativeInteger(getCellValue(cells, "damagedInTransit"), {
      required: false,
    });
    const diseasedInTransit = parseNonNegativeInteger(getCellValue(cells, "diseasedInTransit"), {
      required: false,
    });
    const parasite = parseNonNegativeInteger(getCellValue(cells, "parasite"), { required: false });
    const nonEmergence = parseNonNegativeInteger(getCellValue(cells, "nonEmergence"), {
      required: false,
    });
    const poorEmergence = parseNonNegativeInteger(getCellValue(cells, "poorEmergence"), {
      required: false,
    });

    if (!scientificName) {
      rowErrors.push(`Row ${rowNumber}: Species is required.`);
      continue;
    }

    if (!supplierCode) {
      rowErrors.push(`Row ${rowNumber}: Supplier is required.`);
      continue;
    }

    if (!shipmentDate) {
      rowErrors.push(`Row ${rowNumber}: Ship date is invalid.`);
      continue;
    }

    if (!arrivalDate) {
      rowErrors.push(`Row ${rowNumber}: Arrival date is invalid.`);
      continue;
    }

    if (numberReceived == null) {
      rowErrors.push(`Row ${rowNumber}: No. rec must be a non-negative integer.`);
      continue;
    }

    if (numberReceivedRaw.trim().length === 0) {
      warnings.push(`Row ${rowNumber}: No. rec was blank and defaulted to 0.`);
    }

    if (
      emergedInTransit == null ||
      damagedInTransit == null ||
      diseasedInTransit == null ||
      parasite == null ||
      nonEmergence == null ||
      poorEmergence == null
    ) {
      rowErrors.push(`Row ${rowNumber}: Transit and quality counts must be non-negative integers.`);
      continue;
    }

    const shipmentDateValue = new Date(shipmentDate).valueOf();
    const arrivalDateValue = new Date(arrivalDate).valueOf();
    const normalizedArrivalDate = arrivalDateValue < shipmentDateValue ? shipmentDate : arrivalDate;

    if (normalizedArrivalDate !== arrivalDate) {
      warnings.push(
        `Row ${rowNumber}: Arrival date was before shipment date and was normalized to shipment date.`,
      );
    }

    rows.push({
      rowNumber,
      scientificName,
      supplierCode,
      shipmentDate,
      arrivalDate: normalizedArrivalDate,
      numberReceived,
      emergedInTransit,
      damagedInTransit,
      diseasedInTransit,
      parasite,
      nonEmergence,
      poorEmergence,
    });
  }

  return { rows, rowErrors, warnings };
}

export function groupShipmentImportRows(rows: ParsedShipmentImportRow[]): ShipmentImportDraft[] {
  const groupedShipments = new Map<
    string,
    {
      supplier_code: string;
      shipment_date: string;
      arrival_date: string;
      items: Map<string, ShipmentImportDraftItem>;
    }
  >();

  for (const row of rows) {
    const key = `${row.supplierCode}|${row.shipmentDate}|${row.arrivalDate}`;
    const bucket = groupedShipments.get(key) ?? {
      supplier_code: row.supplierCode,
      shipment_date: row.shipmentDate,
      arrival_date: row.arrivalDate,
      items: new Map<string, ShipmentImportDraftItem>(),
    };

    const currentItem = bucket.items.get(row.scientificName) ?? {
      scientific_name: row.scientificName,
      number_received: 0,
      emerged_in_transit: 0,
      damaged_in_transit: 0,
      diseased_in_transit: 0,
      parasite: 0,
      non_emergence: 0,
      poor_emergence: 0,
    };

    currentItem.number_received += row.numberReceived;
    currentItem.emerged_in_transit += row.emergedInTransit;
    currentItem.damaged_in_transit += row.damagedInTransit;
    currentItem.diseased_in_transit += row.diseasedInTransit;
    currentItem.parasite += row.parasite;
    currentItem.non_emergence += row.nonEmergence;
    currentItem.poor_emergence += row.poorEmergence;

    bucket.items.set(row.scientificName, currentItem);
    groupedShipments.set(key, bucket);
  }

  return Array.from(groupedShipments.values()).map((shipment) => ({
    supplier_code: shipment.supplier_code,
    shipment_date: shipment.shipment_date,
    arrival_date: shipment.arrival_date,
    items: Array.from(shipment.items.values()),
  }));
}
