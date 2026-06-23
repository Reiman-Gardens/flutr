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
import {
  getGalleryData,
  getGalleryDetailData,
  getGalleryGlobalSpecies,
} from "@/lib/queries/gallery";

const mockSelect = db.select as jest.Mock;
const mockCurrentInFlightBySpeciesSubquery = currentInFlightBySpeciesSubquery as jest.Mock;

describe("gallery queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses shared current in-flight species counts for institution gallery rows", async () => {
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
        range: ["South America"],
        img_wings_open: "https://example.com/morpho.jpg",
        img_wings_closed: "https://example.com/morpho-closed.jpg",
        extra_img_1: null,
        extra_img_2: null,
        in_flight_count: 9,
      },
      {
        id: 2,
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        common_name_override: null,
        family: "Nymphalidae",
        range: ["North America"],
        img_wings_open: "https://example.com/monarch.jpg",
        img_wings_closed: null,
        extra_img_1: null,
        extra_img_2: null,
        in_flight_count: 0,
      },
    ];
    const galleryBuilder = createThenableQuery(rows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(galleryBuilder);

    await expect(getGalleryData(501)).resolves.toEqual({
      species: [
        {
          id: 1,
          scientific_name: "Morpho peleides",
          common_name: "Exhibit Morpho",
          family: "Nymphalidae",
          range: ["South America"],
          img_wings_open: "https://example.com/morpho.jpg",
          in_flight_count: 9,
        },
        {
          id: 2,
          scientific_name: "Danaus plexippus",
          common_name: "Monarch",
          family: "Nymphalidae",
          range: ["North America"],
          img_wings_open: "https://example.com/monarch.jpg",
          in_flight_count: 0,
        },
      ],
    });

    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(501);
    expect(galleryBuilder.leftJoin).toHaveBeenCalledWith(currentSubquery, expect.anything());
  });

  it("preserves zero-current species in detailed gallery results", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const rows = [
      {
        id: 3,
        scientific_name: "Heliconius charithonia",
        common_name: "Zebra Longwing",
        common_name_override: null,
        family: "Nymphalidae",
        range: ["Central America"],
        img_wings_open: "https://example.com/zebra.jpg",
        img_wings_closed: "https://example.com/zebra-closed.jpg",
        extra_img_1: "https://example.com/zebra-1.jpg",
        extra_img_2: null,
        in_flight_count: 0,
      },
    ];
    const galleryBuilder = createThenableQuery(rows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(galleryBuilder);

    await expect(getGalleryDetailData(502)).resolves.toEqual([
      {
        id: 3,
        scientific_name: "Heliconius charithonia",
        common_name: "Zebra Longwing",
        family: "Nymphalidae",
        range: ["Central America"],
        img_wings_open: "https://example.com/zebra.jpg",
        img_wings_closed: "https://example.com/zebra-closed.jpg",
        extra_img_1: "https://example.com/zebra-1.jpg",
        extra_img_2: null,
        in_flight_count: 0,
      },
    ]);
  });

  it("uses shared current in-flight counts for institution-scoped global species rows", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const rows = [
      {
        id: 10,
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        family: "Nymphalidae",
        range: ["South America"],
        img_wings_open: "https://example.com/morpho.jpg",
        in_flight_count: 4,
      },
      {
        id: 11,
        scientific_name: "Caligo memnon",
        common_name: "Owl Butterfly",
        family: "Nymphalidae",
        range: ["South America"],
        img_wings_open: null,
        in_flight_count: 0,
      },
    ];
    const globalBuilder = createThenableQuery(rows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(globalBuilder);

    await expect(getGalleryGlobalSpecies(503)).resolves.toEqual([
      {
        id: 10,
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        family: "Nymphalidae",
        range: ["South America"],
        img_wings_open: "https://example.com/morpho.jpg",
        in_flight_count: 4,
      },
      {
        id: 11,
        scientific_name: "Caligo memnon",
        common_name: "Owl Butterfly",
        family: "Nymphalidae",
        range: ["South America"],
        img_wings_open: null,
        in_flight_count: 0,
      },
    ]);

    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(503);
    expect(globalBuilder.leftJoin).toHaveBeenCalledWith(currentSubquery, expect.anything());
  });

  it("can return matching current counts for institution and global-mode datasets", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const institutionRows = [
      {
        id: 21,
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        common_name_override: null,
        family: "Nymphalidae",
        range: ["South America"],
        img_wings_open: "https://example.com/morpho.jpg",
        img_wings_closed: null,
        extra_img_1: null,
        extra_img_2: null,
        in_flight_count: 4,
      },
    ];
    const globalRows = [
      {
        id: 21,
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        family: "Nymphalidae",
        range: ["South America"],
        img_wings_open: "https://example.com/morpho.jpg",
        in_flight_count: 4,
      },
    ];

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect
      .mockReturnValueOnce(createThenableQuery(institutionRows))
      .mockReturnValueOnce(createThenableQuery(globalRows));

    const [{ species }, globalSpecies] = await Promise.all([
      getGalleryData(504),
      getGalleryGlobalSpecies(504),
    ]);

    expect(species[0].scientific_name).toBe(globalSpecies[0].scientific_name);
    expect(species[0].in_flight_count).toBe(globalSpecies[0].in_flight_count);
  });

  it("keeps zero counts for unscoped global gallery rows", async () => {
    const rows = [
      {
        id: 12,
        scientific_name: "Idea leuconoe",
        common_name: "Paper Kite",
        family: "Nymphalidae",
        range: ["Asia"],
        img_wings_open: "https://example.com/paper-kite.jpg",
        in_flight_count: 0,
      },
    ];
    const globalBuilder = createThenableQuery(rows);

    mockSelect.mockReturnValueOnce(globalBuilder);

    await expect(getGalleryGlobalSpecies()).resolves.toEqual([
      {
        id: 12,
        scientific_name: "Idea leuconoe",
        common_name: "Paper Kite",
        family: "Nymphalidae",
        range: ["Asia"],
        img_wings_open: "https://example.com/paper-kite.jpg",
        in_flight_count: 0,
      },
    ]);

    expect(mockCurrentInFlightBySpeciesSubquery).not.toHaveBeenCalled();
  });
});
