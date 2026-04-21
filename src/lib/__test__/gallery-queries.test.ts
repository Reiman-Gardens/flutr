/**
 * Gallery query behavior contract tests.
 *
 * Request-level deduplication: both getGalleryData and getGalleryDetailData
 * call the same cache()-wrapped queryGallerySpecies function. Within a React
 * Server Component request, the second call returns the cached result without
 * an additional DB round-trip. Jest runs outside that context, so these tests
 * verify the behavioral contract (correct shapes, shared source data) rather
 * than the single-invocation property.
 */

import { createThenableQuery } from "@/__test__/api/_utils/mockDb";
import * as dbModule from "@/lib/db";

jest.mock("@/lib/db");
jest.mock("@/lib/queries/subqueries", () => ({
  inFlightCountSubquery: jest.fn(() => ({
    butterfly_species_id: "butterfly_species_id",
    total: "total",
  })),
}));

const mockDb = dbModule as unknown as { db: { select: jest.Mock } };

const mockRow = {
  id: 1,
  scientific_name: "Papilio glaucus",
  common_name: "Eastern Tiger Swallowtail",
  common_name_override: null,
  family: "Papilionidae",
  range: ["North America"],
  img_wings_open: "open.jpg",
  img_wings_closed: "closed.jpg",
  extra_img_1: "extra1.jpg",
  extra_img_2: null,
  in_flight_count: 3,
};

const mockRowWithOverride = {
  ...mockRow,
  id: 2,
  common_name_override: "Tiger Swallowtail",
};

describe("getGalleryData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns species array with narrowed shape (no extra image columns)", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([mockRow]));

    const { getGalleryData } = await import("@/lib/queries/gallery");
    const result = await getGalleryData(1);

    expect(result.species).toHaveLength(1);
    const species = result.species[0];
    expect(species.id).toBe(1);
    expect(species.common_name).toBe("Eastern Tiger Swallowtail");
    expect(species.img_wings_open).toBe("open.jpg");
    expect(species.in_flight_count).toBe(3);
    // Narrowed — detail-only image fields must not be present
    expect("img_wings_closed" in species).toBe(false);
    expect("extra_img_1" in species).toBe(false);
  });

  it("applies common_name_override when present", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([mockRowWithOverride]));

    const { getGalleryData } = await import("@/lib/queries/gallery");
    const result = await getGalleryData(1);

    expect(result.species[0].common_name).toBe("Tiger Swallowtail");
  });

  it("returns empty array when institution has no species", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([]));

    const { getGalleryData } = await import("@/lib/queries/gallery");
    const result = await getGalleryData(1);

    expect(result.species).toEqual([]);
  });
});

describe("getGalleryDetailData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns full GallerySpeciesDetail shape including all image columns", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([mockRow]));

    const { getGalleryDetailData } = await import("@/lib/queries/gallery");
    const result = await getGalleryDetailData(1);

    expect(result).toHaveLength(1);
    const species = result[0];
    expect(species.id).toBe(1);
    expect(species.img_wings_open).toBe("open.jpg");
    expect(species.img_wings_closed).toBe("closed.jpg");
    expect(species.extra_img_1).toBe("extra1.jpg");
    expect(species.extra_img_2).toBeNull();
    expect(species.in_flight_count).toBe(3);
  });

  it("applies common_name_override when present", async () => {
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([mockRowWithOverride]));

    const { getGalleryDetailData } = await import("@/lib/queries/gallery");
    const result = await getGalleryDetailData(1);

    expect(result[0].common_name).toBe("Tiger Swallowtail");
  });

  it("coerces in_flight_count to number", async () => {
    const rowWithStringCount = { ...mockRow, in_flight_count: "7" as unknown as number };
    mockDb.db.select.mockReturnValueOnce(createThenableQuery([rowWithStringCount]));

    const { getGalleryDetailData } = await import("@/lib/queries/gallery");
    const result = await getGalleryDetailData(1);

    expect(typeof result[0].in_flight_count).toBe("number");
    expect(result[0].in_flight_count).toBe(7);
  });
});
