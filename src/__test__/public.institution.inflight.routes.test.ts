import { GET as getInstitutionInFlight } from "@/app/api/public/institutions/[slug]/in-flight/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const authMock = auth as jest.Mock;

type SelectResult = Record<string, unknown>[];

function makeInstitutionSelect(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

function makeInFlightAggregationSelect(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockResolvedValue(result),
  };
}

describe("Public institution in-flight API route", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 404 when institution slug is missing", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeInstitutionSelect([]));

    const response = await getInstitutionInFlight(
      new Request("http://localhost/api/public/institutions/missing/in-flight"),
      {
        params: Promise.resolve({ slug: "missing" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("returns 200 with empty array when no in-flight rows exist", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeInstitutionSelect([{ id: 5 }]))
      .mockImplementationOnce(() => makeInFlightAggregationSelect([]));

    const response = await getInstitutionInFlight(
      new Request("http://localhost/api/public/institutions/monarch-house/in-flight"),
      {
        params: Promise.resolve({ slug: "monarch-house" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("returns aggregated quantities when multiple rows exist", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeInstitutionSelect([{ id: 5 }]))
      .mockImplementationOnce(() =>
        makeInFlightAggregationSelect([
          {
            scientific_name: "Danaus plexippus",
            common_name: "Monarch",
            img_wings_open: "https://example.com/open.jpg",
            img_wings_closed: "https://example.com/closed.jpg",
            quantity: "17",
          },
        ]),
      );

    const response = await getInstitutionInFlight(
      new Request("http://localhost/api/public/institutions/monarch-house/in-flight"),
      {
        params: Promise.resolve({ slug: "monarch-house" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        image_url: "https://example.com/open.jpg",
        quantity: 17,
      },
    ]);
  });

  it("applies image fallback when wings open image is null", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeInstitutionSelect([{ id: 5 }]))
      .mockImplementationOnce(() =>
        makeInFlightAggregationSelect([
          {
            scientific_name: "Morpho peleides",
            common_name: "Blue Morpho",
            img_wings_open: null,
            img_wings_closed: "https://example.com/closed-only.jpg",
            quantity: 3,
          },
        ]),
      );

    const response = await getInstitutionInFlight(
      new Request("http://localhost/api/public/institutions/monarch-house/in-flight"),
      {
        params: Promise.resolve({ slug: "monarch-house" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([
      {
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        image_url: "https://example.com/closed-only.jpg",
        quantity: 3,
      },
    ]);
  });

  it("does not require authentication", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeInstitutionSelect([]));

    const response = await getInstitutionInFlight(
      new Request("http://localhost/api/public/institutions/no-auth/in-flight"),
      {
        params: Promise.resolve({ slug: "no-auth" }),
      },
    );

    expect(response.status).toBe(404);
    expect(authMock).not.toHaveBeenCalled();
  });
});
