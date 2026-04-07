import { NextRequest } from "next/server";

jest.mock("@/lib/services/platform-shipments", () => ({
  getPlatformShipmentSummary: jest.fn(),
  deletePlatformShipments: jest.fn(),
}));

import {
  getPlatformShipmentSummary,
  deletePlatformShipments,
} from "@/lib/services/platform-shipments";
import {
  GET as getShipmentSummary,
  DELETE as deleteBulkShipments,
} from "@/app/api/platform/institutions/[id]/shipments/route";

const mockGetPlatformShipmentSummary = getPlatformShipmentSummary as jest.Mock;
const mockDeletePlatformShipments = deletePlatformShipments as jest.Mock;

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/institutions/${id}/shipments`);
}

function makeDeleteRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/platform/institutions/${id}/shipments`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Platform Shipment Summary & Bulk Delete API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/platform/institutions/[id]/shipments", () => {
    it("returns 400 for invalid id parameter", async () => {
      const res = (await getShipmentSummary(makeGetRequest("abc"), routeContext("abc")))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthorized requests", async () => {
      mockGetPlatformShipmentSummary.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
      const res = (await getShipmentSummary(makeGetRequest("1"), routeContext("1")))!;
      expect(res.status).toBe(401);
    });

    it("returns 403 for forbidden requests", async () => {
      mockGetPlatformShipmentSummary.mockRejectedValueOnce(new Error("FORBIDDEN"));
      const res = (await getShipmentSummary(makeGetRequest("1"), routeContext("1")))!;
      expect(res.status).toBe(403);
    });

    it("returns 404 when institution is not found", async () => {
      mockGetPlatformShipmentSummary.mockRejectedValueOnce(new Error("NOT_FOUND"));
      const res = (await getShipmentSummary(makeGetRequest("1"), routeContext("1")))!;
      expect(res.status).toBe(404);
    });

    it("returns 200 with shipment summary list", async () => {
      mockGetPlatformShipmentSummary.mockResolvedValueOnce({
        shipments: [
          {
            id: 1,
            supplierCode: "EBN",
            shipmentDate: "2024-03-01",
            arrivalDate: "2024-03-03",
            itemCount: 3,
            totalReceived: 120,
          },
        ],
      });

      const res = (await getShipmentSummary(makeGetRequest("1"), routeContext("1")))!;
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.shipments).toHaveLength(1);
      expect(body.shipments[0].supplierCode).toBe("EBN");
      expect(mockGetPlatformShipmentSummary).toHaveBeenCalledWith({ institutionId: 1 });
    });

    it("returns 200 with empty list when no shipments exist", async () => {
      mockGetPlatformShipmentSummary.mockResolvedValueOnce({ shipments: [] });
      const res = (await getShipmentSummary(makeGetRequest("7"), routeContext("7")))!;
      expect(res.status).toBe(200);
      expect((await res.json()).shipments).toHaveLength(0);
    });
  });

  describe("DELETE /api/platform/institutions/[id]/shipments", () => {
    it("returns 400 for invalid id parameter", async () => {
      const res = (await deleteBulkShipments(
        makeDeleteRequest("abc", { mode: "all" }),
        routeContext("abc"),
      ))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for unrecognised mode", async () => {
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "everything" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for year mode missing year field", async () => {
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "year" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for range mode missing from/to fields", async () => {
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "range" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid calendar date in range mode", async () => {
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "range", from: "2024-02-31", to: "2024-12-31" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when range mode has 'from' after 'to'", async () => {
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "range", from: "2024-12-31", to: "2024-01-01" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthorized requests", async () => {
      mockDeletePlatformShipments.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "all" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(401);
    });

    it("returns 403 for forbidden requests", async () => {
      mockDeletePlatformShipments.mockRejectedValueOnce(new Error("FORBIDDEN"));
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "all" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(403);
    });

    it("returns 404 when institution is not found", async () => {
      mockDeletePlatformShipments.mockRejectedValueOnce(new Error("NOT_FOUND"));
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "all" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(404);
    });

    it("deletes all shipments and returns deleted count", async () => {
      mockDeletePlatformShipments.mockResolvedValueOnce({ deleted: 42 });
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "all" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(200);
      expect((await res.json()).deleted).toBe(42);
      expect(mockDeletePlatformShipments).toHaveBeenCalledWith({
        institutionId: 1,
        options: { mode: "all" },
      });
    });

    it("deletes shipments by year and returns deleted count", async () => {
      mockDeletePlatformShipments.mockResolvedValueOnce({ deleted: 15 });
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "year", year: 2022 }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(200);
      expect((await res.json()).deleted).toBe(15);
      expect(mockDeletePlatformShipments).toHaveBeenCalledWith({
        institutionId: 1,
        options: { mode: "year", year: 2022 },
      });
    });

    it("deletes shipments by range and returns deleted count", async () => {
      mockDeletePlatformShipments.mockResolvedValueOnce({ deleted: 8 });
      const res = (await deleteBulkShipments(
        makeDeleteRequest("1", { mode: "range", from: "2021-01-01", to: "2021-12-31" }),
        routeContext("1"),
      ))!;
      expect(res.status).toBe(200);
      expect((await res.json()).deleted).toBe(8);
      expect(mockDeletePlatformShipments).toHaveBeenCalledWith({
        institutionId: 1,
        options: { mode: "range", from: "2021-01-01", to: "2021-12-31" },
      });
    });
  });
});
