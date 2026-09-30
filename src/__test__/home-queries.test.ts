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
import { getFeaturedSpeciesList, getInstitutionHomeData } from "@/lib/queries/home";
import {
  currentInFlightBySpeciesSubquery,
  getCurrentInFlightSummary,
} from "@/lib/queries/inflight";

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

  it("returns only the in-flight headline stats for home data", async () => {
    mockGetCurrentInFlightSummary.mockResolvedValue({
      totalButterflies: 14,
      totalSpecies: 2,
    });

    await expect(getInstitutionHomeData(302)).resolves.toEqual({
      totalButterflies: 14,
      totalSpecies: 2,
    });

    expect(mockGetCurrentInFlightSummary).toHaveBeenCalledWith(302);
    // The home page no longer loads a species list here; Butterfly of the Day
    // is its own service.
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("preserves explicit zero-current home behavior without crashing", async () => {
    mockGetCurrentInFlightSummary.mockResolvedValue({
      totalButterflies: 0,
      totalSpecies: 0,
    });

    await expect(getInstitutionHomeData(303)).resolves.toEqual({
      totalButterflies: 0,
      totalSpecies: 0,
    });
  });
});
