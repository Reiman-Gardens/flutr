import { NextRequest } from "next/server";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/queries/species", () => ({
  listSpeciesGlobal: jest.fn(),
  createSpecies: jest.fn(),
  getSpeciesById: jest.fn(),
  updateSpecies: jest.fn(),
}));

import { auth } from "@/auth";
import {
  listSpeciesGlobal,
  createSpecies,
  getSpeciesById,
  updateSpecies,
} from "@/lib/queries/species";
import { GET as getSpecies, POST as postSpecies } from "@/app/api/platform/species/route";
import { PATCH as patchSpeciesById } from "@/app/api/platform/species/[id]/route";

const mockAuth = auth as jest.Mock;
const mockListSpeciesGlobal = listSpeciesGlobal as jest.Mock;
const mockCreateSpecies = createSpecies as jest.Mock;
const mockGetSpeciesById = getSpeciesById as jest.Mock;
const mockUpdateSpecies = updateSpecies as jest.Mock;

function makeSession(
  overrides: Partial<{ id: string; role: string; institutionId: number | null }> = {},
): Session {
  const { id = "1", role = "SUPERUSER", institutionId = 1 } = overrides;
  return {
    expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    user: { id, role, institutionId } as Session["user"],
  };
}

function makeGetRequest() {
  return new NextRequest("http://localhost/api/platform/species");
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/platform/species", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/platform/species/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validCreatePayload() {
  return {
    scientific_name: "Papilio glaucus",
    common_name: "Eastern Tiger Swallowtail",
    family: "Papilionidae",
    sub_family: "Papilioninae",
    lifespan_days: 14,
    range: ["North America"],
    description: "A striking yellow butterfly species",
    host_plant: "Willow",
    habitat: "Woodlands",
    fun_facts: "Mimics toxic butterflies",
    img_wings_open: "https://example.com/open.jpg",
    img_wings_closed: "https://example.com/closed.jpg",
  };
}

const sampleSpeciesListItem = {
  id: 10,
  scientificName: "Papilio glaucus",
  commonName: "Eastern Tiger Swallowtail",
  family: "Papilionidae",
  subFamily: "Papilioninae",
  lifespanDays: 14,
  range: ["North America"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("Platform Species API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockAuth.mockResolvedValue(makeSession());
  });

  describe("GET /api/platform/species", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockAuth.mockResolvedValueOnce(makeSession({ role: "ADMIN" }));

      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 200 with species list", async () => {
      mockListSpeciesGlobal.mockResolvedValueOnce([sampleSpeciesListItem]);

      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.species).toHaveLength(1);
      expect(body.species[0].scientificName).toBe("Papilio glaucus");
      expect(mockListSpeciesGlobal).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/platform/species", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockAuth.mockResolvedValueOnce(makeSession({ role: "EMPLOYEE" }));

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 400 for invalid request body", async () => {
      const response = (await postSpecies(makePostRequest({ scientific_name: "Only one field" })))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 201 on successful creation", async () => {
      mockCreateSpecies.mockResolvedValueOnce({ id: 10, ...validCreatePayload() });

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.species.id).toBe(10);
      expect(mockCreateSpecies).toHaveBeenCalledWith(
        expect.objectContaining({ scientific_name: "Papilio glaucus" }),
      );
    });

    it("returns 409 when scientific_name already exists", async () => {
      mockCreateSpecies.mockRejectedValueOnce({ code: "23505" });

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });
  });

  describe("PATCH /api/platform/species/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = (await patchSpeciesById(
        makePatchRequest("10", { common_name: "Updated Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockAuth.mockResolvedValueOnce(makeSession({ role: "ADMIN" }));

      const response = (await patchSpeciesById(
        makePatchRequest("10", { common_name: "Updated Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await patchSpeciesById(
        makePatchRequest("abc", { common_name: "Updated Name" }),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 404 when species is not found", async () => {
      mockGetSpeciesById.mockResolvedValueOnce(null);

      const response = (await patchSpeciesById(
        makePatchRequest("999", { common_name: "Updated Name" }),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 400 when no update fields are provided", async () => {
      mockGetSpeciesById.mockResolvedValueOnce({ id: 10, scientific_name: "Papilio glaucus" });

      const response = (await patchSpeciesById(makePatchRequest("10", {}), routeContext("10")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 200 on successful update", async () => {
      mockGetSpeciesById.mockResolvedValueOnce({ id: 10, scientific_name: "Papilio glaucus" });
      mockUpdateSpecies.mockResolvedValueOnce({
        id: 10,
        scientific_name: "Papilio glaucus",
        common_name: "Updated Name",
      });

      const response = (await patchSpeciesById(
        makePatchRequest("10", { common_name: "Updated Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.species.id).toBe(10);
      expect(body.species.common_name).toBe("Updated Name");
      expect(mockUpdateSpecies).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ common_name: "Updated Name" }),
      );
    });

    it("returns 409 when scientific_name conflicts", async () => {
      mockGetSpeciesById.mockResolvedValueOnce({ id: 10, scientific_name: "Papilio glaucus" });
      mockUpdateSpecies.mockRejectedValueOnce({ code: "23505" });

      const response = (await patchSpeciesById(
        makePatchRequest("10", { scientific_name: "Taken Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });
  });
});
