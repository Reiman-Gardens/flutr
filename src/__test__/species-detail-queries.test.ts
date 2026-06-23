jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/queries/inflight", () => ({
  currentInFlightBySpeciesSubquery: jest.fn(),
}));

import { createThenableQuery } from "@/__test__/api/_utils/mockDb";
import { db } from "@/lib/db";
import { currentInFlightBySpeciesSubquery } from "@/lib/queries/inflight";
import { getSpeciesDetail } from "@/lib/queries/species-detail";

const mockSelect = db.select as jest.Mock;
const mockCurrentInFlightBySpeciesSubquery = currentInFlightBySpeciesSubquery as jest.Mock;

describe("species detail queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the shared current in-flight species helper and preserves overrides", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const rows = [
      {
        id: 1,
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        common_name_override: "Exhibit Morpho",
        family: "Nymphalidae",
        sub_family: "Morphinae",
        lifespan_days: 14,
        lifespan_override: 21,
        range: ["South America"],
        description: "A large blue butterfly",
        host_plant: "Legumes",
        habitat: "Rainforest",
        fun_facts: [{ title: "Color", fact: "Structural blue" }],
        img_wings_open: "https://example.com/morpho.jpg",
        img_wings_closed: "https://example.com/morpho-closed.jpg",
        extra_img_1: "https://example.com/morpho-1.jpg",
        extra_img_2: null,
        in_flight_count: 8,
      },
    ];
    const detailBuilder = createThenableQuery(rows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(detailBuilder);

    await expect(getSpeciesDetail(601, "Morpho peleides")).resolves.toEqual({
      id: 1,
      scientific_name: "Morpho peleides",
      common_name: "Exhibit Morpho",
      family: "Nymphalidae",
      sub_family: "Morphinae",
      lifespan_days: 21,
      range: ["South America"],
      description: "A large blue butterfly",
      host_plant: "Legumes",
      habitat: "Rainforest",
      fun_facts: [{ title: "Color", fact: "Structural blue" }],
      img_wings_open: "https://example.com/morpho.jpg",
      img_wings_closed: "https://example.com/morpho-closed.jpg",
      extra_img_1: "https://example.com/morpho-1.jpg",
      extra_img_2: null,
      in_flight_count: 8,
    });

    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(601);
    expect(detailBuilder.leftJoin).toHaveBeenCalledWith(currentSubquery, expect.anything());
  });

  it("still loads an enabled species with zero current in-flight count", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const rows = [
      {
        id: 2,
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        common_name_override: null,
        family: "Nymphalidae",
        sub_family: "Danainae",
        lifespan_days: 14,
        lifespan_override: null,
        range: ["North America"],
        description: null,
        host_plant: "Milkweed",
        habitat: "Open fields",
        fun_facts: null,
        img_wings_open: "https://example.com/monarch.jpg",
        img_wings_closed: null,
        extra_img_1: null,
        extra_img_2: null,
        in_flight_count: 0,
      },
    ];
    const detailBuilder = createThenableQuery(rows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(detailBuilder);

    await expect(getSpeciesDetail(602, "Danaus plexippus")).resolves.toEqual({
      id: 2,
      scientific_name: "Danaus plexippus",
      common_name: "Monarch",
      family: "Nymphalidae",
      sub_family: "Danainae",
      lifespan_days: 14,
      range: ["North America"],
      description: null,
      host_plant: "Milkweed",
      habitat: "Open fields",
      fun_facts: null,
      img_wings_open: "https://example.com/monarch.jpg",
      img_wings_closed: null,
      extra_img_1: null,
      extra_img_2: null,
      in_flight_count: 0,
    });
  });

  it("returns null when the enabled species is not found for the institution", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const detailBuilder = createThenableQuery([]);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(detailBuilder);

    await expect(getSpeciesDetail(603, "Missing species")).resolves.toBeNull();
  });
});
