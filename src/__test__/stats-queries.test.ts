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
import { getStatsData } from "@/lib/queries/stats";

const mockSelect = db.select as jest.Mock;
const mockCurrentInFlightBySpeciesSubquery = currentInFlightBySpeciesSubquery as jest.Mock;

describe("stats queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the shared current in-flight species subquery for stats rows", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const rows = [
      {
        scientific_name: "Morpho peleides",
        common_name: "Blue Morpho",
        family: "Nymphalidae",
        sub_family: "Morphinae",
        range: ["South America"],
        lifespan_days: 21,
        img_wings_open: "https://example.com/morpho.jpg",
        quantity: 9,
      },
    ];
    const statsBuilder = createThenableQuery(rows);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(statsBuilder);

    await expect(getStatsData(401)).resolves.toEqual(rows);

    expect(mockCurrentInFlightBySpeciesSubquery).toHaveBeenCalledWith(401);
    expect(statsBuilder.from).toHaveBeenCalledWith(currentSubquery);
    expect(statsBuilder.innerJoin).toHaveBeenCalledTimes(1);
    expect(statsBuilder.leftJoin).toHaveBeenCalledTimes(1);
    expect(statsBuilder.orderBy).toHaveBeenCalledTimes(1);
  });

  it("preserves explicit zero-current stats behavior without crashing", async () => {
    const currentSubquery = {
      butterfly_species_id: { kind: "current-species-id" },
      quantity: { kind: "current-quantity" },
    };
    const statsBuilder = createThenableQuery([]);

    mockCurrentInFlightBySpeciesSubquery.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(statsBuilder);

    await expect(getStatsData(402)).resolves.toEqual([]);
  });
});
