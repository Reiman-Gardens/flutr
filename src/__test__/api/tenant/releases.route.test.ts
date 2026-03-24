import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-shipments", () => ({
  RELEASE_ERRORS: {
    INVALID_QUANTITY: "Quantity must be a positive integer",
    DUPLICATE_SHIPMENT_ITEM: "Duplicate shipment_item_id values are not allowed",
    SHIPMENT_NOT_FOUND: "Shipment not found",
    SHIPMENT_ITEM_NOT_FOUND: "Shipment item not found",
    QUANTITY_EXCEEDS_REMAINING: "Quantity exceeds remaining available butterflies",
  },
  createTenantRelease: jest.fn(),
}));

jest.mock("@/lib/services/tenant-releases", () => ({
  RELEASE_ERRORS: {
    INVALID_QUANTITY: "Quantity must be a positive integer",
    DUPLICATE_SHIPMENT_ITEM: "Duplicate shipment_item_id values are not allowed",
    SHIPMENT_NOT_FOUND: "Shipment not found",
    SHIPMENT_ITEM_NOT_FOUND: "Shipment item not found",
    RELEASE_EVENT_NOT_FOUND: "Release event not found",
    IN_FLIGHT_NOT_FOUND: "In-flight row not found",
    IN_FLIGHT_ALREADY_EXISTS: "In-flight row already exists for this release item",
    SHIPMENT_ITEM_RELEASE_MISMATCH: "Shipment item does not belong to the release shipment",
    QUANTITY_EXCEEDS_REMAINING: "Quantity exceeds remaining available butterflies",
  },
  getTenantReleaseById: jest.fn(),
  updateTenantRelease: jest.fn(),
  deleteTenantRelease: jest.fn(),
  createTenantReleaseInFlight: jest.fn(),
}));

import {
  createTenantRelease,
  RELEASE_ERRORS as SHIPMENT_RELEASE_ERRORS,
} from "@/lib/services/tenant-shipments";
import {
  createTenantReleaseInFlight,
  deleteTenantRelease,
  getTenantReleaseById,
  RELEASE_ERRORS as TENANT_RELEASE_ERRORS,
  updateTenantRelease,
} from "@/lib/services/tenant-releases";

import { POST as postReleaseFromShipment } from "@/app/api/tenant/shipments/[id]/releases/route";
import { POST as postInFlightForRelease } from "@/app/api/tenant/releases/[releaseId]/in-flight/route";
import {
  DELETE as deleteReleaseById,
  GET as getReleaseById,
  PATCH as patchReleaseById,
} from "@/app/api/tenant/releases/[releaseId]/route";

const mockCreateTenantRelease = createTenantRelease as jest.Mock;
const mockGetTenantReleaseById = getTenantReleaseById as jest.Mock;
const mockUpdateTenantRelease = updateTenantRelease as jest.Mock;
const mockDeleteTenantRelease = deleteTenantRelease as jest.Mock;
const mockCreateTenantReleaseInFlight = createTenantReleaseInFlight as jest.Mock;

const SLUG = "butterfly-house";

function makePostShipmentReleaseRequest(
  shipmentId: string,
  body: Record<string, unknown>,
  slug?: string,
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;

  return new NextRequest(`http://localhost/api/tenant/shipments/${shipmentId}/releases`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makePostReleaseInFlightRequest(
  releaseId: string,
  body: Record<string, unknown>,
  slug?: string,
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;

  return new NextRequest(`http://localhost/api/tenant/releases/${releaseId}/in-flight`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeReleaseDetailRequest(releaseId: string, method: "GET" | "DELETE", slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;

  return new NextRequest(`http://localhost/api/tenant/releases/${releaseId}`, {
    method,
    headers,
  });
}

function makeReleasePatchRequest(releaseId: string, body: Record<string, unknown>, slug?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;

  return new NextRequest(`http://localhost/api/tenant/releases/${releaseId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function shipmentRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function releaseRouteContext(releaseId: string) {
  return { params: Promise.resolve({ releaseId }) };
}

function validCreateReleasePayload() {
  return {
    released_at: "2026-03-13T12:00:00.000Z",
    items: [
      { shipment_item_id: 101, quantity: 20 },
      { shipment_item_id: 102, quantity: 5 },
    ],
  };
}

function validInFlightPayload() {
  return {
    shipment_item_id: 101,
    quantity: 3,
  };
}

function validReleasePatchPayload() {
  return {
    items: [
      { shipment_item_id: 101, quantity: 9 },
      { shipment_item_id: 102, quantity: 4 },
    ],
  };
}

describe("Tenant Releases API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/tenant/shipments/[id]/releases", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload()),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("abc", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid request body", async () => {
      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", { items: [] }, SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockCreateTenantRelease.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockCreateTenantRelease.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockCreateTenantRelease.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when shipment is not found", async () => {
      mockCreateTenantRelease.mockRejectedValueOnce(
        new Error(SHIPMENT_RELEASE_ERRORS.SHIPMENT_NOT_FOUND),
      );

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when shipment item is not found", async () => {
      mockCreateTenantRelease.mockRejectedValueOnce(
        new Error(SHIPMENT_RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND),
      );

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when quantity exceeds remaining", async () => {
      mockCreateTenantRelease.mockRejectedValueOnce(
        new Error(SHIPMENT_RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING),
      );

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 201 on successful release creation", async () => {
      mockCreateTenantRelease.mockResolvedValueOnce({
        event: {
          id: 500,
          shipmentId: 55,
          releaseDate: "2026-03-13T12:00:00.000Z",
          releasedBy: "Release Admin",
        },
        items: [
          { id: 1, releaseEventId: 500, shipmentItemId: 101, quantity: 20 },
          { id: 2, releaseEventId: 500, shipmentItemId: 102, quantity: 5 },
        ],
      });

      const response = (await postReleaseFromShipment(
        makePostShipmentReleaseRequest("55", validCreateReleasePayload(), SLUG),
        shipmentRouteContext("55"),
      ))!;
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.release.event.id).toBe(500);
      expect(body.release.items).toHaveLength(2);
      expect(mockCreateTenantRelease).toHaveBeenCalledWith(
        expect.objectContaining({ slug: SLUG, shipmentId: 55 }),
      );
    });
  });

  describe("POST /api/tenant/releases/[releaseId]/in-flight", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload()),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("abc", validInFlightPayload(), SLUG),
        releaseRouteContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid request body", async () => {
      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", { shipment_item_id: 101, quantity: 0 }, SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when release event is not found", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND),
      );

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when shipment item is not found", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND),
      );

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when quantity exceeds remaining", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING),
      );

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 409 when shipment item does not belong to release shipment", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.SHIPMENT_ITEM_RELEASE_MISMATCH),
      );

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 409 when in-flight row already exists", async () => {
      mockCreateTenantReleaseInFlight.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.IN_FLIGHT_ALREADY_EXISTS),
      );

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 201 on successful create", async () => {
      mockCreateTenantReleaseInFlight.mockResolvedValueOnce({
        id: 9,
        releaseEventId: 500,
        shipmentItemId: 101,
        quantity: 3,
      });

      const response = (await postInFlightForRelease(
        makePostReleaseInFlightRequest("500", validInFlightPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.inFlight.id).toBe(9);
      expect(mockCreateTenantReleaseInFlight).toHaveBeenCalledWith(
        expect.objectContaining({ slug: SLUG, releaseId: 500, shipment_item_id: 101, quantity: 3 }),
      );
    });
  });

  describe("GET /api/tenant/releases/[releaseId]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await getReleaseById(
        makeReleaseDetailRequest("500", "GET"),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await getReleaseById(
        makeReleaseDetailRequest("abc", "GET", SLUG),
        releaseRouteContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetTenantReleaseById.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getReleaseById(
        makeReleaseDetailRequest("500", "GET", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockGetTenantReleaseById.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getReleaseById(
        makeReleaseDetailRequest("500", "GET", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockGetTenantReleaseById.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await getReleaseById(
        makeReleaseDetailRequest("500", "GET", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when release event is not found", async () => {
      mockGetTenantReleaseById.mockResolvedValueOnce(null);

      const response = (await getReleaseById(
        makeReleaseDetailRequest("500", "GET", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 with event and items", async () => {
      mockGetTenantReleaseById.mockResolvedValueOnce({
        event: {
          id: 500,
          shipmentId: 55,
          releaseDate: "2026-03-13T12:00:00.000Z",
          releasedBy: "Release Admin",
        },
        items: [
          { id: 1, shipmentItemId: 101, quantity: 20 },
          { id: 2, shipmentItemId: 102, quantity: 5 },
        ],
      });

      const response = (await getReleaseById(
        makeReleaseDetailRequest("500", "GET", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.event.id).toBe(500);
      expect(body.items).toHaveLength(2);
      expect(mockGetTenantReleaseById).toHaveBeenCalledWith({ slug: SLUG, releaseId: 500 });
    });
  });

  describe("PATCH /api/tenant/releases/[releaseId]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload()),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await patchReleaseById(
        makeReleasePatchRequest("abc", validReleasePatchPayload(), SLUG),
        releaseRouteContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid request body", async () => {
      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", { items: [] }, SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when release event is not found", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND),
      );

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when release item is not found", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND),
      );

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when quantity exceeds remaining", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING),
      );

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid quantity", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.INVALID_QUANTITY),
      );

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for duplicate shipment_item_id values", async () => {
      mockUpdateTenantRelease.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.DUPLICATE_SHIPMENT_ITEM),
      );

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 200 on successful update", async () => {
      mockUpdateTenantRelease.mockResolvedValueOnce({ updated: true });

      const response = (await patchReleaseById(
        makeReleasePatchRequest("500", validReleasePatchPayload(), SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(200);
      expect((await response.json()).updated).toBe(true);
      expect(mockUpdateTenantRelease).toHaveBeenCalledWith(
        expect.objectContaining({ slug: SLUG, releaseId: 500 }),
      );
    });
  });

  describe("DELETE /api/tenant/releases/[releaseId]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("500", "DELETE"),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route params", async () => {
      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("abc", "DELETE", SLUG),
        releaseRouteContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockDeleteTenantRelease.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("500", "DELETE", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when permission check fails", async () => {
      mockDeleteTenantRelease.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("500", "DELETE", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant slug cannot be resolved", async () => {
      mockDeleteTenantRelease.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("500", "DELETE", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when release event is not found", async () => {
      mockDeleteTenantRelease.mockRejectedValueOnce(
        new Error(TENANT_RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND),
      );

      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("500", "DELETE", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 on successful delete", async () => {
      mockDeleteTenantRelease.mockResolvedValueOnce({ deleted: true });

      const response = (await deleteReleaseById(
        makeReleaseDetailRequest("500", "DELETE", SLUG),
        releaseRouteContext("500"),
      ))!;
      expect(response.status).toBe(200);
      expect((await response.json()).deleted).toBe(true);
      expect(mockDeleteTenantRelease).toHaveBeenCalledWith({ slug: SLUG, releaseId: 500 });
    });
  });
});
