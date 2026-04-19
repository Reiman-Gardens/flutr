import { NextRequest } from "next/server";

jest.mock("@/lib/services/platform-species", () => ({
  getPlatformSpecies: jest.fn(),
  getPlatformSpeciesById: jest.fn(),
  createPlatformSpecies: jest.fn(),
  updatePlatformSpecies: jest.fn(),
  deletePlatformSpecies: jest.fn(),
}));

import {
  getPlatformSpecies,
  getPlatformSpeciesById,
  createPlatformSpecies,
  updatePlatformSpecies,
  deletePlatformSpecies,
} from "@/lib/services/platform-species";
import { GET as getSpecies, POST as postSpecies } from "@/app/api/platform/species/route";
import {
  GET as getSpeciesById,
  PATCH as patchSpeciesById,
  DELETE as deleteSpeciesById,
} from "@/app/api/platform/species/[id]/route";

const mockGetPlatformSpecies = getPlatformSpecies as jest.Mock;
const mockGetPlatformSpeciesById = getPlatformSpeciesById as jest.Mock;
const mockCreatePlatformSpecies = createPlatformSpecies as jest.Mock;
const mockUpdatePlatformSpecies = updatePlatformSpecies as jest.Mock;
const mockDeletePlatformSpecies = deletePlatformSpecies as jest.Mock;

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

function makeGetByIdRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/species/${id}`);
}

function makePatchRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/platform/species/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/platform/species/${id}`, {
    method: "DELETE",
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
    fun_facts: [{ title: "Fun Fact", fact: "Mimics toxic butterflies" }],
    img_wings_open: "https://example.com/open.jpg",
    img_wings_closed: "https://example.com/closed.jpg",
  };
}

describe("Platform Species API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ──────────────────────────────────────────────
  // GET /api/platform/species
  // ──────────────────────────────────────────────

  describe("GET /api/platform/species", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetPlatformSpecies.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockGetPlatformSpecies.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 200 with species list", async () => {
      mockGetPlatformSpecies.mockResolvedValueOnce([
        { id: 10, scientificName: "Papilio glaucus", commonName: "Eastern Tiger Swallowtail" },
        { id: 11, scientificName: "Morpho peleides", commonName: "Blue Morpho" },
      ]);

      const response = (await getSpecies(makeGetRequest()))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.species).toHaveLength(2);
      expect(mockGetPlatformSpecies).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────
  // POST /api/platform/species
  // ──────────────────────────────────────────────

  describe("POST /api/platform/species", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockCreatePlatformSpecies.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockCreatePlatformSpecies.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid request body", async () => {
      const response = (await postSpecies(makePostRequest({ scientific_name: "Only one field" })))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when fun_facts uses the legacy string shape", async () => {
      const response = (await postSpecies(
        makePostRequest({
          ...validCreatePayload(),
          fun_facts: "Mimics toxic butterflies",
        }),
      ))!;

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 201 on successful creation", async () => {
      mockCreatePlatformSpecies.mockResolvedValueOnce({ id: 10, ...validCreatePayload() });

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.species.id).toBe(10);
      expect(mockCreatePlatformSpecies).toHaveBeenCalledWith(
        expect.objectContaining({ scientific_name: "Papilio glaucus" }),
      );
    });

    it("returns 409 when scientific_name already exists", async () => {
      mockCreatePlatformSpecies.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await postSpecies(makePostRequest(validCreatePayload())))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/platform/species/[id]
  // ──────────────────────────────────────────────

  describe("GET /api/platform/species/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetPlatformSpeciesById.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await getSpeciesById(makeGetByIdRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockGetPlatformSpeciesById.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await getSpeciesById(makeGetByIdRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 with species", async () => {
      mockGetPlatformSpeciesById.mockResolvedValueOnce({
        id: 10,
        scientificName: "Papilio glaucus",
        commonName: "Eastern Tiger Swallowtail",
      });

      const response = (await getSpeciesById(makeGetByIdRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.species.id).toBe(10);
      expect(mockGetPlatformSpeciesById).toHaveBeenCalledWith(10);
    });

    it("returns 404 when species not found", async () => {
      mockGetPlatformSpeciesById.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await getSpeciesById(makeGetByIdRequest("999"), routeContext("999")))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await getSpeciesById(makeGetByIdRequest("abc"), routeContext("abc")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /api/platform/species/[id]
  // ──────────────────────────────────────────────

  describe("PATCH /api/platform/species/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockUpdatePlatformSpecies.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await patchSpeciesById(
        makePatchRequest("10", { common_name: "Updated Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockUpdatePlatformSpecies.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await patchSpeciesById(
        makePatchRequest("10", { common_name: "Updated Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await patchSpeciesById(
        makePatchRequest("abc", { common_name: "Updated Name" }),
        routeContext("abc"),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when no update fields are provided", async () => {
      const response = (await patchSpeciesById(makePatchRequest("10", {}), routeContext("10")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 200 on successful update", async () => {
      mockUpdatePlatformSpecies.mockResolvedValueOnce({
        id: 10,
        scientificName: "Papilio glaucus",
        commonName: "Updated Name",
      });

      const response = (await patchSpeciesById(
        makePatchRequest("10", { common_name: "Updated Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.species.id).toBe(10);
      expect(mockUpdatePlatformSpecies).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ common_name: "Updated Name" }),
      );
    });

    it("allows clearing fun_facts with null", async () => {
      mockUpdatePlatformSpecies.mockResolvedValueOnce({
        id: 10,
        scientificName: "Papilio glaucus",
        commonName: "Eastern Tiger Swallowtail",
        fun_facts: null,
      });

      const response = (await patchSpeciesById(
        makePatchRequest("10", { fun_facts: null }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(200);

      expect(mockUpdatePlatformSpecies).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ fun_facts: null }),
      );
    });

    it("returns 409 when scientific_name conflicts", async () => {
      mockUpdatePlatformSpecies.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await patchSpeciesById(
        makePatchRequest("10", { scientific_name: "Taken Name" }),
        routeContext("10"),
      ))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 404 when species not found", async () => {
      mockUpdatePlatformSpecies.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await patchSpeciesById(
        makePatchRequest("999", { common_name: "Updated" }),
        routeContext("999"),
      ))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /api/platform/species/[id]
  // ──────────────────────────────────────────────

  describe("DELETE /api/platform/species/[id]", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockDeletePlatformSpecies.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await deleteSpeciesById(makeDeleteRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-SUPERUSER", async () => {
      mockDeletePlatformSpecies.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await deleteSpeciesById(makeDeleteRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(403);
    });

    it("returns 200 for successful delete", async () => {
      mockDeletePlatformSpecies.mockResolvedValueOnce(undefined);

      const response = (await deleteSpeciesById(makeDeleteRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.deleted).toBe(true);
      expect(mockDeletePlatformSpecies).toHaveBeenCalledWith(10);
    });

    it("returns 404 when species not found", async () => {
      mockDeletePlatformSpecies.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await deleteSpeciesById(makeDeleteRequest("999"), routeContext("999")))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when species is already referenced", async () => {
      mockDeletePlatformSpecies.mockRejectedValueOnce(new Error("CONFLICT"));

      const response = (await deleteSpeciesById(makeDeleteRequest("10"), routeContext("10")))!;
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid id parameter", async () => {
      const response = (await deleteSpeciesById(makeDeleteRequest("abc"), routeContext("abc")))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });
  });
});
