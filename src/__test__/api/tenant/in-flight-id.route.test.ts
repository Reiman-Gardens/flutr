import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-releases", () => ({
  RELEASE_ERRORS: {
    INVALID_QUANTITY: "Quantity must be a positive integer",
    SHIPMENT_ITEM_NOT_FOUND: "Shipment item not found",
    IN_FLIGHT_NOT_FOUND: "In-flight row not found",
    QUANTITY_EXCEEDS_REMAINING: "Quantity exceeds remaining available butterflies",
    GOOD_EMERGENCE_UNTRACKED:
      "This shipment item's Released total is historically untracked (NULL) and cannot be modified by a release operation",
    GOOD_EMERGENCE_UNDERFLOW:
      "Release would reduce good emergence below zero; adjust release quantities or shipment totals first",
  },
  updateTenantInFlight: jest.fn(),
  deleteTenantInFlight: jest.fn(),
}));

import { updateTenantInFlight, deleteTenantInFlight } from "@/lib/services/tenant-releases";
import {
  PATCH as patchInFlightById,
  DELETE as deleteInFlightById,
} from "@/app/api/tenant/in-flight/[id]/route";

const mockUpdateTenantInFlight = updateTenantInFlight as jest.Mock;
const mockDeleteTenantInFlight = deleteTenantInFlight as jest.Mock;

const SLUG = "butterfly-house";

function makePatchRequest(id: string, body: Record<string, unknown>, slug?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;

  return new NextRequest(`http://localhost/api/tenant/in-flight/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string, slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;

  return new NextRequest(`http://localhost/api/tenant/in-flight/${id}`, {
    method: "DELETE",
    headers,
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Tenant In-Flight [id] API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("PATCH /api/tenant/in-flight/[id]", () => {
    it("returns 409 when quantity exceeds remaining", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(
        new Error("Quantity exceeds remaining available butterflies"),
      );

      const response = (await patchInFlightById(
        makePatchRequest("9", { quantity: 9 }, SLUG),
        routeContext("9"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 409 when the target item's good_emergence is untracked (NULL)", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(
        new Error(
          "This shipment item's Released total is historically untracked (NULL) and cannot be modified by a release operation",
        ),
      );

      const response = (await patchInFlightById(
        makePatchRequest("9", { quantity: 9 }, SLUG),
        routeContext("9"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 409 when the update would drive good_emergence below zero", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(
        new Error(
          "Release would reduce good emergence below zero; adjust release quantities or shipment totals first",
        ),
      );

      const response = (await patchInFlightById(
        makePatchRequest("9", { quantity: 1 }, SLUG),
        routeContext("9"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 200 on successful update", async () => {
      mockUpdateTenantInFlight.mockResolvedValueOnce({
        id: 9,
        releaseEventId: 500,
        shipmentItemId: 101,
        quantity: 9,
      });

      const response = (await patchInFlightById(
        makePatchRequest("9", { quantity: 9 }, SLUG),
        routeContext("9"),
      ))!;
      expect(response.status).toBe(200);
      expect((await response.json()).inFlight.quantity).toBe(9);
    });
  });

  describe("DELETE /api/tenant/in-flight/[id]", () => {
    it("returns 404 when the shipment item is not found", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(new Error("Shipment item not found"));

      const response = (await deleteInFlightById(makeDeleteRequest("9", SLUG), routeContext("9")))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when the target item's good_emergence is untracked (NULL)", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(
        new Error(
          "This shipment item's Released total is historically untracked (NULL) and cannot be modified by a release operation",
        ),
      );

      const response = (await deleteInFlightById(makeDeleteRequest("9", SLUG), routeContext("9")))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 409 when the delete would drive good_emergence below zero", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(
        new Error(
          "Release would reduce good emergence below zero; adjust release quantities or shipment totals first",
        ),
      );

      const response = (await deleteInFlightById(makeDeleteRequest("9", SLUG), routeContext("9")))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 200 on successful delete", async () => {
      mockDeleteTenantInFlight.mockResolvedValueOnce({ deleted: true });

      const response = (await deleteInFlightById(makeDeleteRequest("9", SLUG), routeContext("9")))!;
      expect(response.status).toBe(200);
      expect((await response.json()).deleted).toBe(true);
    });
  });
});
