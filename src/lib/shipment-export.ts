import { NextRequest, NextResponse } from "next/server";
import { invalidRequest } from "@/lib/api-response";
import { shipmentExportQuerySchema } from "@/lib/validation/shipment-import";
import { requireValidQuery } from "@/lib/validation/query";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ShipmentExportRange = {
  from?: string;
  to?: string;
};

type ParsedShipmentExportQuery = {
  from?: string;
  to?: string;
  range?: ShipmentExportRange;
};

export function parseShipmentExportQuery(
  request: NextRequest,
): { data: ParsedShipmentExportQuery } | { error: Response } {
  const queryResult = requireValidQuery(
    shipmentExportQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if ("error" in queryResult) return queryResult;

  const format = queryResult.data.format ?? "xlsx";
  if (format !== "xlsx") {
    return { error: invalidRequest("Unsupported export format") };
  }

  const { from, to } = queryResult.data;
  if (from && to && from > to) {
    return { error: invalidRequest("'from' date must not be after 'to' date") };
  }

  return {
    data: {
      from,
      to,
      range: (from ?? to) ? { from, to } : undefined,
    },
  };
}

function buildRangeLabel(from?: string, to?: string) {
  const fromYear = from?.slice(0, 4);
  const toYear = to?.slice(0, 4);
  return (fromYear ?? toYear) ? `-${fromYear ?? "start"}-${toYear ?? "now"}` : "";
}

export function buildShipmentExportFilename(base: string, from?: string, to?: string) {
  return `${base}${buildRangeLabel(from, to)}.xlsx`;
}

export function buildShipmentWorkbookResponse(workbook: Uint8Array, filename: string) {
  const workbookBytes = Uint8Array.from(workbook);
  const workbookBlob = new Blob([workbookBytes], {
    type: XLSX_CONTENT_TYPE,
  });

  return new NextResponse(workbookBlob, {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
