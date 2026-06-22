jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/queries/inflight", () => ({
  currentInFlightBySpeciesSubquery: jest.fn(),
  getCurrentInFlightSummary: jest.fn(),
}));

import { createThenableQuery } from "@/__test__/api/_utils/mockDb";
import { db } from "@/lib/db";
import {
  getButterflyOfTheDayForInstitution,
  getFeaturedSpeciesList,
  getInstitutionHomeData,
} from "@/lib/queries/home";
import {
  currentInFlightBySpeciesSubquery,
  getCurrentInFlightSummary,
} from "@/lib/queries/inflight";
import { seededDayIndex } from "@/lib/utils";

const mockSelect = db.select as jest.Mock;
const mockCurrentInFlightBySpeciesSubquery = currentInFlightBySpeciesSubquery as jest.Mock;
const mockGetCurrentInFlightSummary = getCurrentInFlightSummary as jest.Mock;

describe("home queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses shared current in-flight species counts for featured species rows", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const speciesRows = [
      {
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        family: "Nymphalidae",
        img_wings_open: "https://example.com/monarch.jpg",
        range: ["North America"],
        lifespan_days: 14,
        host_plant: "Milkweed",
        in_flight_count: 6,
      },
    ];
    const speciesBuilder = createThenableQuery(speciesRows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(speciesBuilder);

    await expect(getFeaturedSpeciesList(301)).resolves.toEqual(speciesRows);

    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(301);
    expect(speciesBuilder.from).toHaveBeenCalled();
    expect(speciesBuilder.from).toHaveBeenCalledWith(currentSubquery);
  });

  it("uses the shared current summary and current species rows for home data", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const summary = {
      totalButterflies: 14,
      totalSpecies: 2,
    };
    const speciesRows = [
      {
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        img_wings_open: "https://example.com/morpho.jpg",
        range: ["South America"],
        lifespan_days: 21,
        host_plant: "Legumes",
        in_flight_count: 9,
      },
      {
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        img_wings_open: "https://example.com/monarch.jpg",
        range: ["North America"],
        lifespan_days: 14,
        host_plant: "Milkweed",
        in_flight_count: 5,
      },
    ];
    const speciesBuilder = createThenableQuery(speciesRows);

    mockGetCurrentInFlightSummary.mockResolvedValue(summary);
    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(speciesBuilder);

    await expect(getInstitutionHomeData(302)).resolves.toEqual({
      totalButterflies: 14,
      totalSpecies: 2,
      speciesRows,
    });

    expect(mockGetCurrentInFlightSummary).toHaveBeenCalledWith(302);
    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(302);
    expect(speciesBuilder.leftJoin).toHaveBeenCalledWith(currentSubquery, expect.anything());
  });

  it("preserves explicit zero-current home behavior without crashing", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const speciesRows = [
      {
        scientific_name: "Heliconius charithonia",
        common_name: "Zebra Longwing",
        img_wings_open: "https://example.com/zebra.jpg",
        range: ["Central America"],
        lifespan_days: 18,
        host_plant: "Passionflower",
        in_flight_count: 0,
      },
    ];
    const speciesBuilder = createThenableQuery(speciesRows);

    mockGetCurrentInFlightSummary.mockResolvedValue({
      totalButterflies: 0,
      totalSpecies: 0,
    });
    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(speciesBuilder);

    await expect(getInstitutionHomeData(303)).resolves.toEqual({
      totalButterflies: 0,
      totalSpecies: 0,
      speciesRows,
    });
  });

  it("selects Butterfly of the Day deterministically from positive current candidates", async () => {
    jest.spyOn(Date, "now").mockReturnValue(86_400_000 * 42);

    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const speciesRows = [
      {
        scientific_name: "Belenois creona",
        common_name: "African Caper",
        family: "Pieridae",
        img_wings_open: "https://example.com/caper.jpg",
        range: ["Africa"],
        lifespan_days: 12,
        host_plant: "Capparis",
        in_flight_count: 2,
      },
      {
        scientific_name: "Papilio maackii",
        common_name: "Alpine Black Swallowtail",
        family: "Papilionidae",
        img_wings_open: "https://example.com/maackii.jpg",
        range: ["Asia"],
        lifespan_days: 10,
        host_plant: "Citrus",
        in_flight_count: 1,
      },
      {
        scientific_name: "Pteronymia agalla",
        common_name: "Aletta Clearwing",
        family: "Nymphalidae",
        img_wings_open: null,
        range: ["South America"],
        lifespan_days: 9,
        host_plant: null,
        in_flight_count: 3,
      },
    ];
    const speciesBuilder = createThenableQuery(speciesRows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(speciesBuilder);

    await expect(getButterflyOfTheDayForInstitution(304)).resolves.toEqual(
      speciesRows[seededDayIndex(speciesRows.length, 304)],
    );

    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(304);

    jest.restoreAllMocks();
  });

  it("returns null when there are no current Butterfly of the Day candidates", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const speciesBuilder = createThenableQuery([]);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(speciesBuilder);

    await expect(getButterflyOfTheDayForInstitution(305)).resolves.toBeNull();
  });
});
