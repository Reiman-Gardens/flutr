import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-species", () => ({
  getTenantSpecies: jest.fn(),
  updateTenantSpeciesOverride: jest.fn(),
}));

import { getTenantSpecies, updateTenantSpeciesOverride } from "@/lib/services/tenant-species";
import { GET as getSpecies } from "@/app/api/tenant/species/route";
import { PATCH as patchSpeciesOverride } from "@/app/api/tenant/species/[id]/route";

const mockGetTenantSpecies = getTenantSpecies as jest.Mock;
const mockUpdateTenantSpeciesOverride = updateTenantSpeciesOverride as jest.Mock;

const SLUG = "butterfly-house";

function makeGetRequest(slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest("http://localhost/api/tenant/species", { headers });
}

function makePatchRequest(id: string, body: Record<string, unknown>, slug?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest(`http://localhost/api/tenant/species/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Tenant Species API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /api/tenant/species
  // -----------------------------------------------------------------------

  describe("GET /api/tenant/species", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetTenantSpecies.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getSpecies(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockGetTenantSpecies.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getSpecies(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when institution not found", async () => {
      mockGetTenantSpecies.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await getSpecies(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 with species list and calls service with slug", async () => {
      mockGetTenantSpecies.mockResolvedValueOnce([
        {
          id: 10,
          scientificName: "Papilio glaucus",
          commonName: "Eastern Tiger Swallowtail",
          commonNameOverride: null,
          lifespanDays: 14,
          lifespanOverride: null,
        },
      ]);

      const response = (await getSpecies(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.species)).toBe(true);
      expect(body.species).toHaveLength(1);
      expect(body.species[0].scientificName).toBe("Papilio glaucus");
      expect(mockGetTenantSpecies).toHaveBeenCalledWith({ slug: SLUG });
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /api/tenant/species/[id]
  // -----------------------------------------------------------------------

  describe("PATCH /api/tenant/species/[id]", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await patchSpeciesOverride(
        makePatchRequest("10", { common_name_override: "Swallowtail" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid route id", async () => {
      const response = (await patchSpeciesOverride(
        makePatchRequest("abc", { common_name_override: "Swallowtail" }, SLUG),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid body (no updatable fields)", async () => {
      const response = (await patchSpeciesOverride(
        makePatchRequest("10", {}, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when body contains institutionId (rejected by .strict())", async () => {
      const response = (await patchSpeciesOverride(
        makePatchRequest("10", { common_name_override: "Swallowtail", institutionId: 5 }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockUpdateTenantSpeciesOverride.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchSpeciesOverride(
        makePatchRequest("10", { common_name_override: "Swallowtail" }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when user lacks manage permission", async () => {
      mockUpdateTenantSpeciesOverride.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchSpeciesOverride(
        makePatchRequest("10", { common_name_override: "Swallowtail" }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when species does not exist", async () => {
      mockUpdateTenantSpeciesOverride.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await patchSpeciesOverride(
        makePatchRequest("999", { common_name_override: "Swallowtail" }, SLUG),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 on successful override update and calls service with slug", async () => {
      mockUpdateTenantSpeciesOverride.mockResolvedValueOnce({
        id: 1,
        speciesId: 10,
        institutionId: 1,
        commonNameOverride: "Tiger Swallowtail",
        lifespanOverride: 18,
      });

      const response = (await patchSpeciesOverride(
        makePatchRequest(
          "10",
          { common_name_override: "Tiger Swallowtail", lifespan_override: 18 },
          SLUG,
        ),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.override.speciesId).toBe(10);
      expect(body.override.commonNameOverride).toBe("Tiger Swallowtail");
      expect(mockUpdateTenantSpeciesOverride).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: SLUG,
          speciesId: 10,
          common_name_override: "Tiger Swallowtail",
          lifespan_override: 18,
        }),
      );
    });

    it("accepts null to clear an override", async () => {
      mockUpdateTenantSpeciesOverride.mockResolvedValueOnce({
        id: 1,
        speciesId: 10,
        institutionId: 1,
        commonNameOverride: null,
        lifespanOverride: 18,
      });

      const response = (await patchSpeciesOverride(
        makePatchRequest("10", { common_name_override: null }, SLUG),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.override.commonNameOverride).toBeNull();
    });
  });
});
