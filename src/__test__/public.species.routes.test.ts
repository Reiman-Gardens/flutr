import { GET as getPublicSpecies } from "@/app/api/public/species/route";
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

function makeSelect(result: SelectResult) {
  return {
    from: jest.fn().mockResolvedValue(result),
  };
}

describe("Public species API route", () => {
  beforeEach(() => {
    authMock.mockReset();
    (db.select as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  it("returns 200 with empty array when no species exist", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getPublicSpecies();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("returns 200 with expected projection", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([
        {
          scientific_name: "Danaus plexippus",
          common_name: "Monarch",
          family: "Nymphalidae",
          sub_family: "Danainae",
          img_wings_open: "https://example.com/open.jpg",
          img_wings_closed: "https://example.com/closed.jpg",
        },
      ]),
    );

    const response = await getPublicSpecies();

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual([
      {
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        family: "Nymphalidae",
        sub_family: "Danainae",
        image_url: "https://example.com/open.jpg",
      },
    ]);

    expect(body[0]).not.toHaveProperty("description");
    expect(body[0]).not.toHaveProperty("host_plant");
    expect(body[0]).not.toHaveProperty("habitat");
    expect(body[0]).not.toHaveProperty("fun_facts");
    expect(body[0]).not.toHaveProperty("extra_img_1");
    expect(body[0]).not.toHaveProperty("extra_img_2");
    expect(body[0]).not.toHaveProperty("created_at");
    expect(body[0]).not.toHaveProperty("updated_at");
  });

  it("applies image fallback from wings open to wings closed", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() =>
      makeSelect([
        {
          scientific_name: "Morpho peleides",
          common_name: "Blue Morpho",
          family: "Nymphalidae",
          sub_family: "Morphinae",
          img_wings_open: null,
          img_wings_closed: "https://example.com/closed-only.jpg",
        },
      ]),
    );

    const response = await getPublicSpecies();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0].image_url).toBe("https://example.com/closed-only.jpg");
  });

  it("does not require authentication", async () => {
    (db.select as jest.Mock).mockImplementationOnce(() => makeSelect([]));

    const response = await getPublicSpecies();

    expect(response.status).toBe(200);
    expect(authMock).not.toHaveBeenCalled();
  });
});
