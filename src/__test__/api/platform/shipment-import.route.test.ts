import { NextRequest } from "next/server";

jest.mock("@/lib/services/shipment-import", () => ({
  getPlatformShipmentImportPreview: jest.fn(),
  commitPlatformShipmentImport: jest.fn(),
  exportPlatformShipmentWorkbook: jest.fn(),
}));

import {
  getPlatformShipmentImportPreview,
  commitPlatformShipmentImport,
  exportPlatformShipmentWorkbook,
} from "@/lib/services/shipment-import";
import { POST as previewImport } from "@/app/api/platform/institutions/[id]/shipments/import/preview/route";
import { POST as commitImport } from "@/app/api/platform/institutions/[id]/shipments/import/commit/route";
import { GET as exportShipments } from "@/app/api/platform/institutions/[id]/shipments/export/route";

const mockGetPlatformShipmentImportPreview = getPlatformShipmentImportPreview as jest.Mock;
const mockCommitPlatformShipmentImport = commitPlatformShipmentImport as jest.Mock;
const mockExportPlatformShipmentWorkbook = exportPlatformShipmentWorkbook as jest.Mock;

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePreviewRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/platform/institutions/1/shipments/import/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeCommitRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/platform/institutions/1/shipments/import/commit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeExportRequest(id: string, query = "") {
  return new NextRequest(
    `http://localhost/api/platform/institutions/${id}/shipments/export${query}`,
    {
      method: "GET",
    },
  );
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

describe("Platform Shipment Import API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/platform/institutions/[id]/shipments/import/preview", () => {
    it("returns 400 for invalid id parameter", async () => {
      const response = (await previewImport(
        makePreviewRequest(validPreviewBody()),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid body", async () => {
      const response = (await previewImport(
        makePreviewRequest({ raw_text: "" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthorized requests", async () => {
      mockGetPlatformShipmentImportPreview.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
      const response = (await previewImport(
        makePreviewRequest(validPreviewBody()),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(401);
    });

    it("returns 200 for valid preview", async () => {
      mockGetPlatformShipmentImportPreview.mockResolvedValueOnce({
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

      const response = (await previewImport(
        makePreviewRequest(validPreviewBody()),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);
      expect(mockGetPlatformShipmentImportPreview).toHaveBeenCalledWith(
        expect.objectContaining({ institutionId: 1 }),
      );
    });
  });

  describe("POST /api/platform/institutions/[id]/shipments/import/commit", () => {
    it("returns 400 for invalid body", async () => {
      const response = (await commitImport(
        makeCommitRequest({ preview_hash: "bad" }),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for preview hash mismatch", async () => {
      mockCommitPlatformShipmentImport.mockRejectedValueOnce(new Error("PREVIEW_HASH_MISMATCH"));

      const response = (await commitImport(
        makeCommitRequest(validCommitBody()),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 200 for valid commit", async () => {
      mockCommitPlatformShipmentImport.mockResolvedValueOnce({
        created: 1,
        failed: 0,
        skipped: 0,
        failures: [],
        warnings: [],
      });

      const response = (await commitImport(
        makeCommitRequest(validCommitBody()),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);
      expect(mockCommitPlatformShipmentImport).toHaveBeenCalledWith(
        expect.objectContaining({ institutionId: 1 }),
      );
    });
  });

  describe("GET /api/platform/institutions/[id]/shipments/export", () => {
    it("returns 400 for invalid id parameter", async () => {
      const response = (await exportShipments(makeExportRequest("abc"), routeContext("abc")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for unsupported format", async () => {
      const response = (await exportShipments(
        makeExportRequest("1", "?format=csv"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns xlsx content for valid request", async () => {
      mockExportPlatformShipmentWorkbook.mockResolvedValueOnce(Buffer.from("xlsx"));

      const response = (await exportShipments(
        makeExportRequest("1", "?format=xlsx"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockExportPlatformShipmentWorkbook).toHaveBeenCalledWith({ institutionId: 1 });
    });

    it("returns 400 when 'from' is after 'to'", async () => {
      const response = (await exportShipments(
        makeExportRequest("1", "?format=xlsx&from=2024-12-31&to=2020-01-01"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("passes date range to service when both from and to are provided", async () => {
      mockExportPlatformShipmentWorkbook.mockResolvedValueOnce(Buffer.from("xlsx"));

      const response = (await exportShipments(
        makeExportRequest("1", "?format=xlsx&from=2020-01-01&to=2024-12-31"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);
      expect(mockExportPlatformShipmentWorkbook).toHaveBeenCalledWith({
        institutionId: 1,
        range: { from: "2020-01-01", to: "2024-12-31" },
      });
    });

    it("passes partial range to service when only from is provided", async () => {
      mockExportPlatformShipmentWorkbook.mockResolvedValueOnce(Buffer.from("xlsx"));

      const response = (await exportShipments(
        makeExportRequest("1", "?format=xlsx&from=2020-01-01"),
        routeContext("1"),
      ))!;
      expect(response.status).toBe(200);
      expect(mockExportPlatformShipmentWorkbook).toHaveBeenCalledWith(
        expect.objectContaining({ range: expect.objectContaining({ from: "2020-01-01" }) }),
      );
    });
  });
});
