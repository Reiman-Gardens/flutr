import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-releases", () => ({
  RELEASE_ERRORS: {
    INVALID_QUANTITY: "Quantity must be a positive integer",
    SHIPMENT_ITEM_NOT_FOUND: "Shipment item not found",
    IN_FLIGHT_NOT_FOUND: "In-flight row not found",
    QUANTITY_EXCEEDS_REMAINING: "Quantity exceeds remaining available butterflies",
  },
  updateTenantInFlight: jest.fn(),
  deleteTenantInFlight: jest.fn(),
}));

import {
  deleteTenantInFlight,
  RELEASE_ERRORS,
  updateTenantInFlight,
} from "@/lib/services/tenant-releases";
import {
  PATCH as patchInFlight,
  DELETE as deleteInFlight,
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

describe("Tenant In-Flight API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("PATCH /api/tenant/in-flight/[id]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 3 }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await patchInFlight(
        makePatchRequest("abc", { quantity: 3 }, SLUG),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid body", async () => {
      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 0 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 3 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 3 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 3 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when in-flight row does not exist", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(new Error(RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND));

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 3 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when shipment item does not exist", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(
        new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND),
      );

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 3 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when quantity exceeds remaining", async () => {
      mockUpdateTenantInFlight.mockRejectedValueOnce(
        new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING),
      );

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 99 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 200 for successful quantity update", async () => {
      mockUpdateTenantInFlight.mockResolvedValueOnce({
        id: 10,
        releaseEventId: 5,
        shipmentItemId: 42,
        quantity: 6,
      });

      const response = (await patchInFlight(
        makePatchRequest("10", { quantity: 6 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.inFlight.quantity).toBe(6);
      expect(mockUpdateTenantInFlight).toHaveBeenCalledWith({
        slug: SLUG,
        inFlightId: 10,
        quantity: 6,
      });
    });
  });

  describe("DELETE /api/tenant/in-flight/[id]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await deleteInFlight(makeDeleteRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await deleteInFlight(makeDeleteRequest("abc", SLUG), routeContext("abc")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await deleteInFlight(makeDeleteRequest("10", SLUG), routeContext("10")))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await deleteInFlight(makeDeleteRequest("10", SLUG), routeContext("10")))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await deleteInFlight(makeDeleteRequest("10", SLUG), routeContext("10")))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when in-flight row does not exist", async () => {
      mockDeleteTenantInFlight.mockRejectedValueOnce(new Error(RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND));

      const response = (await deleteInFlight(makeDeleteRequest("10", SLUG), routeContext("10")))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 for successful delete", async () => {
      mockDeleteTenantInFlight.mockResolvedValueOnce({ deleted: true });

      const response = (await deleteInFlight(makeDeleteRequest("10", SLUG), routeContext("10")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);
      expect(mockDeleteTenantInFlight).toHaveBeenCalledWith({
        slug: SLUG,
        inFlightId: 10,
      });
    });
  });
});
