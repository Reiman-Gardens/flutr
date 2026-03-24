import { NextRequest } from "next/server";

jest.mock("@/lib/queries/inflight", () => ({
  getInstitutionInFlightBySlug: jest.fn(),
}));

import { GET } from "@/app/api/public/institutions/[slug]/in-flight/route";
import { getInstitutionInFlightBySlug } from "@/lib/queries/inflight";

const mockGetInstitutionInFlightBySlug = getInstitutionInFlightBySlug as jest.Mock;

function makeRequest(query: Record<string, string> = {}) {
  const params = new URLSearchParams(query);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return new NextRequest(`http://localhost/api/public/institutions/some-slug/in-flight${suffix}`);
}

describe("Public In-Flight API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/public/institutions/[slug]/in-flight", () => {
    it("returns 400 for invalid slug params", async () => {
      const response = (await GET(makeRequest(), {
        params: Promise.resolve({ slug: "Bad Slug" }),
      }))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 for invalid query params", async () => {
      const response = (await GET(makeRequest({ page: "1" }), {
        params: Promise.resolve({ slug: "some-slug" }),
      }))!;
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("returns 404 when institution is not found", async () => {
      mockGetInstitutionInFlightBySlug.mockResolvedValueOnce(null);

      const response = (await GET(makeRequest(), {
        params: Promise.resolve({ slug: "some-slug" }),
      }))!;
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 200 with in-flight species aggregation", async () => {
      mockGetInstitutionInFlightBySlug.mockResolvedValueOnce([
        {
          scientific_name: "Danaus plexippus",
          common_name: "Monarch",
          image_url: "https://example.com/monarch.jpg",
          quantity: 24,
        },
      ]);

      const response = (await GET(makeRequest(), {
        params: Promise.resolve({ slug: "some-slug" }),
      }))!;
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.inFlight).toHaveLength(1);
      expect(body.inFlight[0].scientific_name).toBe("Danaus plexippus");
      expect(mockGetInstitutionInFlightBySlug).toHaveBeenCalledWith("some-slug");
    });

    it("returns 500 on unexpected errors", async () => {
      mockGetInstitutionInFlightBySlug.mockRejectedValueOnce(new Error("boom"));

      const response = (await GET(makeRequest(), {
        params: Promise.resolve({ slug: "some-slug" }),
      }))!;
      expect(response.status).toBe(500);
      expect((await response.json()).error.code).toBe("INTERNAL_ERROR");
    });
  });
});
