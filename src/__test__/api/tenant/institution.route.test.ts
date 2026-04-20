import { NextRequest } from "next/server";

jest.mock("@/lib/services/tenant-institution", () => ({
  viewTenantInstitutionService: jest.fn(),
  updateTenantInstitutionService: jest.fn(),
}));

import {
  viewTenantInstitutionService,
  updateTenantInstitutionService,
} from "@/lib/services/tenant-institution";
import { GET, PATCH } from "@/app/api/tenant/institution/route";

const mockViewTenantInstitutionService = viewTenantInstitutionService as jest.Mock;
const mockUpdateTenantInstitutionService = updateTenantInstitutionService as jest.Mock;

const SLUG = "butterfly-house";

function makeGetRequest(slug?: string) {
  const headers: Record<string, string> = {};
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest("http://localhost/api/tenant/institution", { headers });
}

function makePatchRequest(body: Record<string, unknown>, slug?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug) headers["x-tenant-slug"] = slug;
  return new NextRequest("http://localhost/api/tenant/institution", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

const sampleInstitution = {
  id: 1,
  slug: SLUG,
  name: "Butterfly House",
  city: "Austin",
  state_province: "TX",
  country: "USA",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Tenant Institution API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /api/tenant/institution
  // -----------------------------------------------------------------------

  describe("GET /api/tenant/institution", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await GET(makeGetRequest()))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockViewTenantInstitutionService.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockViewTenantInstitutionService.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when institution not found", async () => {
      mockViewTenantInstitutionService.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 with institution and calls service with slug", async () => {
      mockViewTenantInstitutionService.mockResolvedValueOnce(sampleInstitution);

      const response = (await GET(makeGetRequest(SLUG)))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.institution.id).toBe(1);
      expect(body.institution.name).toBe("Butterfly House");
      expect(mockViewTenantInstitutionService).toHaveBeenCalledWith(SLUG);
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /api/tenant/institution
  // -----------------------------------------------------------------------

  describe("PATCH /api/tenant/institution", () => {
    it("returns 400 when x-tenant-slug header is missing", async () => {
      const response = (await PATCH(makePatchRequest({ name: "Updated" })))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockUpdateTenantInstitutionService.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const response = (await PATCH(makePatchRequest({ name: "Updated" }, SLUG)))!;
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 for insufficient permission", async () => {
      mockUpdateTenantInstitutionService.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const response = (await PATCH(makePatchRequest({ name: "Updated" }, SLUG)))!;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("returns 400 for invalid body (unknown field rejected by .strict())", async () => {
      const response = (await PATCH(makePatchRequest({ unexpected: "field" }, SLUG)))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when body contains institutionId (rejected by .strict())", async () => {
      const response = (await PATCH(
        makePatchRequest({ name: "Updated", institutionId: 5 }, SLUG),
      ))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 404 when institution not found", async () => {
      mockUpdateTenantInstitutionService.mockRejectedValueOnce(new Error("NOT_FOUND"));

      const response = (await PATCH(makePatchRequest({ name: "Updated" }, SLUG)))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 on successful update and calls service with slug", async () => {
      const updated = { ...sampleInstitution, name: "New Name" };
      mockUpdateTenantInstitutionService.mockResolvedValueOnce(updated);

      const response = (await PATCH(makePatchRequest({ name: "New Name" }, SLUG)))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.institution.name).toBe("New Name");
      expect(mockUpdateTenantInstitutionService).toHaveBeenCalledWith(
        SLUG,
        expect.objectContaining({ name: "New Name" }),
      );
    });

    it("sanitizes HTML from text fields before passing to service", async () => {
      mockUpdateTenantInstitutionService.mockResolvedValueOnce(sampleInstitution);

      await PATCH(
        makePatchRequest(
          {
            name: "  New Name  ",
            city: "  <b>Austin</b>  ",
            description: "  <b>Updated profile</b>  ",
          },
          SLUG,
        ),
      );

      expect(mockUpdateTenantInstitutionService).toHaveBeenCalledWith(
        SLUG,
        expect.objectContaining({
          name: "New Name",
          city: "Austin",
          description: "Updated profile",
        }),
      );
    });

    it("accepts theme_colors as an array of strings", async () => {
      mockUpdateTenantInstitutionService.mockResolvedValueOnce(sampleInstitution);

      const response = (await PATCH(
        makePatchRequest({ theme_colors: ["#FF5733", "#33FF57"] }, SLUG),
      ))!;
      expect(response.status).toBe(200);
      expect(mockUpdateTenantInstitutionService).toHaveBeenCalledWith(
        SLUG,
        expect.objectContaining({ theme_colors: ["#FF5733", "#33FF57"] }),
      );
    });

    it("accepts social_links as a string record", async () => {
      mockUpdateTenantInstitutionService.mockResolvedValueOnce(sampleInstitution);

      const response = (await PATCH(
        makePatchRequest({ social_links: { twitter: "https://twitter.com/test" } }, SLUG),
      ))!;
      expect(response.status).toBe(200);
      expect(mockUpdateTenantInstitutionService).toHaveBeenCalledWith(
        SLUG,
        expect.objectContaining({ social_links: { twitter: "https://twitter.com/test" } }),
      );
    });

    it("accepts time_zone as a string", async () => {
      mockUpdateTenantInstitutionService.mockResolvedValueOnce(sampleInstitution);

      const response = (await PATCH(makePatchRequest({ time_zone: "America/Chicago" }, SLUG)))!;
      expect(response.status).toBe(200);
      expect(mockUpdateTenantInstitutionService).toHaveBeenCalledWith(
        SLUG,
        expect.objectContaining({ time_zone: "America/Chicago" }),
      );
    });

    it("accepts donation_url and volunteer_url as strings", async () => {
      mockUpdateTenantInstitutionService.mockResolvedValueOnce(sampleInstitution);

      const response = (await PATCH(
        makePatchRequest(
          {
            donation_url: "https://example.org/donate",
            volunteer_url: "https://example.org/volunteer",
          },
          SLUG,
        ),
      ))!;
      expect(response.status).toBe(200);
      expect(mockUpdateTenantInstitutionService).toHaveBeenCalledWith(
        SLUG,
        expect.objectContaining({
          donation_url: "https://example.org/donate",
          volunteer_url: "https://example.org/volunteer",
        }),
      );
    });
  });
});
