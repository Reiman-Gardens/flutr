import { GET as getInstitutionSpeciesDetail } from "@/app/api/public/institutions/[slug]/species/[scientific_name]/route";
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

function makeSpeciesSelect(result: SelectResult) {
  return {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

describe("Public institution species detail API route", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 404 when institution is missing", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeInstitutionSelect([]));

    const response = await getInstitutionSpeciesDetail(
      new Request("http://localhost/api/public/institutions/missing/species/Danaus%20plexippus"),
      {
        params: Promise.resolve({ slug: "missing", scientific_name: "Danaus plexippus" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("returns 404 when global species is not found", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeInstitutionSelect([{ id: 9 }]))
      .mockImplementationOnce(() => makeSpeciesSelect([]));

    const response = await getInstitutionSpeciesDetail(
      new Request(
        "http://localhost/api/public/institutions/monarch-house/species/Danaus%20plexippus",
      ),
      {
        params: Promise.resolve({ slug: "monarch-house", scientific_name: "Danaus plexippus" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("returns global species detail even when institution override is absent", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeInstitutionSelect([{ id: 9 }]))
      .mockImplementationOnce(() =>
        makeSpeciesSelect([
          {
            scientific_name: "Danaus plexippus",
            common_name: "Monarch",
            common_name_override: null,
            lifespan_days: 28,
            lifespan_override: null,
            family: "Nymphalidae",
            sub_family: "Danainae",
            range: ["North America"],
            description: "Migratory butterfly",
            host_plant: "Milkweed",
            habitat: "Open fields",
            fun_facts: "Long-distance migration",
            img_wings_open: "https://example.com/open.jpg",
            img_wings_closed: "https://example.com/closed.jpg",
            extra_img_1: null,
            extra_img_2: null,
          },
        ]),
      );

    const response = await getInstitutionSpeciesDetail(
      new Request(
        "http://localhost/api/public/institutions/monarch-house/species/Danaus%20plexippus",
      ),
      {
        params: Promise.resolve({ slug: "monarch-house", scientific_name: "Danaus plexippus" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      scientific_name: "Danaus plexippus",
      common_name: "Monarch",
      lifespan_days: 28,
      family: "Nymphalidae",
      sub_family: "Danainae",
      range: ["North America"],
      description: "Migratory butterfly",
      host_plant: "Milkweed",
      habitat: "Open fields",
      fun_facts: "Long-distance migration",
      images: ["https://example.com/open.jpg", "https://example.com/closed.jpg"],
    });
  });

  it("returns 200 with correct override behavior", async () => {
    (db.select as jest.Mock)
      .mockImplementationOnce(() => makeInstitutionSelect([{ id: 9 }]))
      .mockImplementationOnce(() =>
        makeSpeciesSelect([
          {
            scientific_name: "Danaus plexippus",
            common_name: "Monarch",
            common_name_override: "Royal Monarch",
            lifespan_days: 28,
            lifespan_override: 35,
            family: "Nymphalidae",
            sub_family: "Danainae",
            range: ["North America"],
            description: "Migratory butterfly",
            host_plant: "Milkweed",
            habitat: "Open fields",
            fun_facts: "Long-distance migration",
            img_wings_open: "https://example.com/open.jpg",
            img_wings_closed: "https://example.com/closed.jpg",
            extra_img_1: "https://example.com/extra1.jpg",
            extra_img_2: "https://example.com/extra2.jpg",
          },
        ]),
      );

    const response = await getInstitutionSpeciesDetail(
      new Request(
        "http://localhost/api/public/institutions/monarch-house/species/Danaus%20plexippus",
      ),
      {
        params: Promise.resolve({ slug: "monarch-house", scientific_name: "Danaus plexippus" }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      scientific_name: "Danaus plexippus",
      common_name: "Royal Monarch",
      lifespan_days: 35,
      family: "Nymphalidae",
      sub_family: "Danainae",
      range: ["North America"],
      description: "Migratory butterfly",
      host_plant: "Milkweed",
      habitat: "Open fields",
      fun_facts: "Long-distance migration",
      images: [
        "https://example.com/open.jpg",
        "https://example.com/closed.jpg",
        "https://example.com/extra1.jpg",
        "https://example.com/extra2.jpg",
      ],
    });
  });

  it("does not require authentication", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeInstitutionSelect([]));

    const response = await getInstitutionSpeciesDetail(
      new Request("http://localhost/api/public/institutions/no-auth/species/Danaus%20plexippus"),
      {
        params: Promise.resolve({ slug: "no-auth", scientific_name: "Danaus plexippus" }),
      },
    );

    expect(response.status).toBe(404);
    expect(authMock).not.toHaveBeenCalled();
  });
});
