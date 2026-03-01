import { GET as getInstitutionSpecies } from "@/app/api/public/institutions/[slug]/species/route";
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

function makeSelectWithLimit(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

function makeSelectWithJoin(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(result),
  };
}

describe("Public institution species API route", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 404 when institution slug is missing", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelectWithLimit([]));

    const response = await getInstitutionSpecies(
      new Request("http://localhost/api/public/institutions/missing/species"),
      {
        params: Promise.resolve({ slug: "missing" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("returns 200 with empty array when institution has no enabled species", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeSelectWithLimit([{ id: 10 }]))
      .mockImplementationOnce(() => makeSelectWithJoin([]));

    const response = await getInstitutionSpecies(
      new Request("http://localhost/api/public/institutions/monarch-house/species"),
      {
        params: Promise.resolve({ slug: "monarch-house" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("applies override logic for common name and lifespan", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeSelectWithLimit([{ id: 10 }]))
      .mockImplementationOnce(() =>
        makeSelectWithJoin([
          {
            scientific_name: "Danaus plexippus",
            common_name: "Monarch",
            common_name_override: "Royal Monarch",
            lifespan_days: 28,
            lifespan_override: 35,
            family: "Nymphalidae",
            sub_family: "Danainae",
            img_wings_open: "https://example.com/open.jpg",
            img_wings_closed: "https://example.com/closed.jpg",
          },
        ]),
      );

    const response = await getInstitutionSpecies(
      new Request("http://localhost/api/public/institutions/monarch-house/species"),
      {
        params: Promise.resolve({ slug: "monarch-house" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual([
      {
        scientific_name: "Danaus plexippus",
        common_name: "Royal Monarch",
        lifespan_days: 35,
        family: "Nymphalidae",
        sub_family: "Danainae",
        image_url: "https://example.com/open.jpg",
      },
    ]);
  });

  it("applies image fallback when wings open image is null", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeSelectWithLimit([{ id: 10 }]))
      .mockImplementationOnce(() =>
        makeSelectWithJoin([
          {
            scientific_name: "Morpho peleides",
            common_name: "Blue Morpho",
            common_name_override: null,
            lifespan_days: 21,
            lifespan_override: null,
            family: "Nymphalidae",
            sub_family: "Morphinae",
            img_wings_open: null,
            img_wings_closed: "https://example.com/closed-only.jpg",
          },
        ]),
      );

    const response = await getInstitutionSpecies(
      new Request("http://localhost/api/public/institutions/monarch-house/species"),
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
        lifespan_days: 21,
        family: "Nymphalidae",
        sub_family: "Morphinae",
        image_url: "https://example.com/closed-only.jpg",
      },
    ]);
  });

  it("does not require authentication", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelectWithLimit([]));

    const response = await getInstitutionSpecies(
      new Request("http://localhost/api/public/institutions/no-auth/species"),
      {
        params: Promise.resolve({ slug: "no-auth" }),
      },
    );

    expect(response.status).toBe(404);
    expect(authMock).not.toHaveBeenCalled();
  });
});
