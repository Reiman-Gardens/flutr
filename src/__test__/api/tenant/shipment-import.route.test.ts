import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-shipment-import", () => ({
  getTenantShipmentImportPreview: jest.fn(),
  commitTenantShipmentImport: jest.fn(),
  exportTenantShipmentWorkbook: jest.fn(),
}));

import {
  getTenantShipmentImportPreview,
  commitTenantShipmentImport,
  exportTenantShipmentWorkbook,
} from "@/lib/services/tenant-shipment-import";
import { POST as previewImport } from "@/app/api/tenant/shipments/import/preview/route";
import { POST as commitImport } from "@/app/api/tenant/shipments/import/commit/route";
import { GET as exportShipments } from "@/app/api/tenant/shipments/export/route";

const mockGetTenantShipmentImportPreview = getTenantShipmentImportPreview as jest.Mock;
const mockCommitTenantShipmentImport = commitTenantShipmentImport as jest.Mock;
const mockExportTenantShipmentWorkbook = exportTenantShipmentWorkbook as jest.Mock;

function makePreviewRequest(body: Record<string, unknown>, slug?: string) {
  return new NextRequest("http://localhost/api/tenant/shipments/import/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(slug ? { "x-tenant-slug": slug } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeCommitRequest(body: Record<string, unknown>, slug?: string) {
  return new NextRequest("http://localhost/api/tenant/shipments/import/commit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(slug ? { "x-tenant-slug": slug } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeExportRequest(slug?: string, query = "") {
  return new NextRequest(`http://localhost/api/tenant/shipments/export${query}`, {
    method: "GET",
    headers: slug ? { "x-tenant-slug": slug } : undefined,
  });
}

function validPreviewBody() {
  return {
    raw_text:
      "Species,No. rec,Supplier,Ship date,Arrival date\nCaligo atreus,10,EBN,12/9/25,12/11/25",
    source: {
      kind: "paste",
    },
  };
}

function validCommitBody() {
  return {
    preview_hash: `sha256:${"a".repeat(64)}`,
    shipments: [
      {
        supplier_code: "EBN",
        shipment_date: "2025-12-09T12:00:00.000Z",
        arrival_date: "2025-12-11T12:00:00.000Z",
        items: [
          {
            scientific_name: "caligo atreus",
            number_received: 10,
            emerged_in_transit: 0,
            damaged_in_transit: 0,
            diseased_in_transit: 0,
            parasite: 0,
            non_emergence: 0,
            poor_emergence: 0,
          },
        ],
      },
    ],
  };
}

describe("Tenant Shipment Import API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/tenant/shipments/import/preview", () => {
    it("returns 400 when tenant slug header is missing", async () => {
      const response = (await previewImport(makePreviewRequest(validPreviewBody())))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 200 for valid preview", async () => {
      mockGetTenantShipmentImportPreview.mockResolvedValueOnce({
        summary: {
          total_rows: 1,
          shipments_detected: 1,
          row_errors: 0,
          warnings: 0,
          unknown_species: 0,
          unknown_suppliers: 0,
        },
        row_errors: [],
        warnings: [],
        unknown_species: [],
        unknown_suppliers: [],
        shipments: [],
        preview_hash: `sha256:${"b".repeat(64)}`,
      });

      const response = (await previewImport(makePreviewRequest(validPreviewBody(), "demo")))!;
      expect(response.status).toBe(200);
      expect(mockGetTenantShipmentImportPreview).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "demo" }),
      );
    });
  });

  describe("POST /api/tenant/shipments/import/commit", () => {
    it("returns 400 when tenant slug header is missing", async () => {
      const response = (await commitImport(makeCommitRequest(validCommitBody())))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 200 for valid commit", async () => {
      mockCommitTenantShipmentImport.mockResolvedValueOnce({
        created: 1,
        failed: 0,
        skipped: 0,
        failures: [],
        warnings: [],
      });

      const response = (await commitImport(makeCommitRequest(validCommitBody(), "demo")))!;
      expect(response.status).toBe(200);
      expect(mockCommitTenantShipmentImport).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "demo" }),
      );
    });
  });

  describe("GET /api/tenant/shipments/export", () => {
    it("returns 400 when tenant slug header is missing", async () => {
      const response = (await exportShipments(makeExportRequest()))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns xlsx content for valid request", async () => {
      mockExportTenantShipmentWorkbook.mockResolvedValueOnce(Buffer.from("xlsx"));

      const response = (await exportShipments(makeExportRequest("demo", "?format=xlsx")))!;
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockExportTenantShipmentWorkbook).toHaveBeenCalledWith({ slug: "demo" });
    });

    it("returns 400 when 'from' is after 'to'", async () => {
      const response = (await exportShipments(
        makeExportRequest("demo", "?format=xlsx&from=2024-12-31&to=2020-01-01"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("passes date range to service when both from and to are provided", async () => {
      mockExportTenantShipmentWorkbook.mockResolvedValueOnce(Buffer.from("xlsx"));

      const response = (await exportShipments(
        makeExportRequest("demo", "?format=xlsx&from=2020-01-01&to=2024-12-31"),
      ))!;
      expect(response.status).toBe(200);
      expect(mockExportTenantShipmentWorkbook).toHaveBeenCalledWith({
        slug: "demo",
        range: { from: "2020-01-01", to: "2024-12-31" },
      });
    });

    it("passes partial range to service when only to is provided", async () => {
      mockExportTenantShipmentWorkbook.mockResolvedValueOnce(Buffer.from("xlsx"));

      const response = (await exportShipments(
        makeExportRequest("demo", "?format=xlsx&to=2024-12-31"),
      ))!;
      expect(response.status).toBe(200);
      expect(mockExportTenantShipmentWorkbook).toHaveBeenCalledWith(
        expect.objectContaining({ range: expect.objectContaining({ to: "2024-12-31" }) }),
      );
    });
  });
});
