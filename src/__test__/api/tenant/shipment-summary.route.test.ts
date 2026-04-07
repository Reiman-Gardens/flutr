import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-shipments", () => ({
  getTenantShipmentSummary: jest.fn(),
}));

import { getTenantShipmentSummary } from "@/lib/services/tenant-shipments";
import { GET as getShipmentSummary } from "@/app/api/tenant/shipments/summary/route";

const mockGetTenantShipmentSummary = getTenantShipmentSummary as jest.Mock;

const SLUG = "butterfly-house";

function makeRequest(slug?: string) {
  return new NextRequest("http://localhost/api/tenant/shipments/summary", {
    headers: slug ? { "x-tenant-slug": slug } : undefined,
  });
}

describe("GET /api/tenant/shipments/summary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 400 when x-tenant-slug header is missing", async () => {
    const res = (await getShipmentSummary(makeRequest()))!;
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetTenantShipmentSummary.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const res = (await getShipmentSummary(makeRequest(SLUG)))!;
    expect(res.status).toBe(401);
  });

  it("returns 403 for insufficient permission", async () => {
    mockGetTenantShipmentSummary.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const res = (await getShipmentSummary(makeRequest(SLUG)))!;
    expect(res.status).toBe(403);
  });

  it("returns 404 when tenant slug cannot be resolved", async () => {
    mockGetTenantShipmentSummary.mockRejectedValueOnce(new Error("NOT_FOUND"));
    const res = (await getShipmentSummary(makeRequest(SLUG)))!;
    expect(res.status).toBe(404);
  });

  it("returns 200 with shipment summary list", async () => {
    mockGetTenantShipmentSummary.mockResolvedValueOnce({
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

    const res = (await getShipmentSummary(makeRequest(SLUG)))!;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shipments).toHaveLength(1);
    expect(body.shipments[0].supplierCode).toBe("EBN");
    expect(mockGetTenantShipmentSummary).toHaveBeenCalledWith({ slug: SLUG });
  });

  it("returns 200 with empty list when no shipments exist", async () => {
    mockGetTenantShipmentSummary.mockResolvedValueOnce({ shipments: [] });
    const res = (await getShipmentSummary(makeRequest(SLUG)))!;
    expect(res.status).toBe(200);
    expect((await res.json()).shipments).toHaveLength(0);
  });
});
