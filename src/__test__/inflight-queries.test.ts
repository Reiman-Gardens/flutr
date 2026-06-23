import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { createThenableQuery } from "@/__test__/api/_utils/mockDb";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  currentInFlightBySpeciesSubquery,
  getCurrentInFlightSummary,
  getInstitutionInFlightBySlug,
  historicalReleasedBySpeciesSubquery,
} from "@/lib/queries/inflight";

const mockSelect = db.select as jest.Mock;
const dialect = new PgDialect();

function createSubqueryBuilder() {
  return createThenableQuery([]) as ReturnType<typeof createThenableQuery> & {
    as: jest.Mock;
  };
}

function toSql(fragment: unknown) {
  return dialect.sqlToQuery(
    (fragment as { getSQL: () => Parameters<PgDialect["sqlToQuery"]>[0] }).getSQL(),
  ).sql;
}

describe("in-flight query helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds current in-flight query with release date plus effective lifespan filtering", () => {
    const builder = createSubqueryBuilder();
    const currentSubquery = {
      butterfly_species_id: sql<number>`"current_in_flight_by_species"."butterfly_species_id"`,
      quantity: sql<number>`"current_in_flight_by_species"."quantity"`,
    };

    builder.as.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValue(builder);

    const result = currentInFlightBySpeciesSubquery(42);

    expect(result).toBe(currentSubquery);
    expect(builder.innerJoin).toHaveBeenCalledTimes(3);
    expect(builder.leftJoin).toHaveBeenCalledTimes(1);
    expect(builder.groupBy).toHaveBeenCalledTimes(1);
    expect(builder.as).toHaveBeenCalledWith("current_in_flight_by_species");

    const whereSql = toSql((builder.where.mock.calls as unknown as unknown[][])[0][0]);
    const overrideJoinSql = toSql((builder.leftJoin.mock.calls as unknown as unknown[][])[0][1]);

    expect(whereSql).toContain('"release_events"."release_date"');
    expect(whereSql).toContain('"butterfly_species_institution"."lifespan_override"');
    expect(whereSql).toContain('"butterfly_species"."lifespan_days"');
    expect(whereSql).toContain("coalesce(");
    expect(whereSql).toContain("> now()");
    expect(whereSql).toContain('"in_flight"."institution_id"');
    expect(overrideJoinSql).toContain('"butterfly_species_institution"."institution_id"');
  });

  it("builds historical released query without release-date or lifespan filtering", () => {
    const builder = createSubqueryBuilder();
    const historicalSubquery = {
      butterfly_species_id: sql<number>`"historical_released_by_species"."butterfly_species_id"`,
      quantity: sql<number>`"historical_released_by_species"."quantity"`,
    };

    builder.as.mockReturnValue(historicalSubquery);
    mockSelect.mockReturnValue(builder);

    const result = historicalReleasedBySpeciesSubquery(7);

    expect(result).toBe(historicalSubquery);
    expect(builder.innerJoin).toHaveBeenCalledTimes(1);
    expect(builder.leftJoin).not.toHaveBeenCalled();
    expect(builder.groupBy).toHaveBeenCalledTimes(1);
    expect(builder.as).toHaveBeenCalledWith("historical_released_by_species");

    const whereSql = toSql((builder.where.mock.calls as unknown as unknown[][])[0][0]);

    expect(whereSql).toContain('"in_flight"."institution_id"');
    expect(whereSql).not.toContain('"release_events"');
    expect(whereSql).not.toContain("lifespan_override");
    expect(whereSql).not.toContain("lifespan_days");
  });

  it("returns numeric current in-flight summary totals", async () => {
    const currentBuilder = createSubqueryBuilder();
    const summaryBuilder = createThenableQuery([
      {
        totalButterflies: "12",
        totalSpecies: "3",
      },
    ]);
    const currentSubquery = {
      butterfly_species_id: sql<number>`"current_in_flight_by_species"."butterfly_species_id"`,
      quantity: sql<number>`"current_in_flight_by_species"."quantity"`,
    };

    currentBuilder.as.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(currentBuilder).mockReturnValueOnce(summaryBuilder);

    await expect(getCurrentInFlightSummary(9)).resolves.toEqual({
      totalButterflies: 12,
      totalSpecies: 3,
    });

    expect(summaryBuilder.from).toHaveBeenCalledWith(currentSubquery);
  });

  it("defaults current in-flight summary totals to zero when no rows are returned", async () => {
    const currentBuilder = createSubqueryBuilder();
    const summaryBuilder = createThenableQuery([]);
    const currentSubquery = {
      butterfly_species_id: sql<number>`"current_in_flight_by_species"."butterfly_species_id"`,
      quantity: sql<number>`"current_in_flight_by_species"."quantity"`,
    };

    currentBuilder.as.mockReturnValue(currentSubquery);
    mockSelect.mockReturnValueOnce(currentBuilder).mockReturnValueOnce(summaryBuilder);

    await expect(getCurrentInFlightSummary(9)).resolves.toEqual({
      totalButterflies: 0,
      totalSpecies: 0,
    });
  });

  it("uses the shared current helper path for institution slug lookups and preserves public shape", async () => {
    const institutionBuilder = createThenableQuery([{ id: 5 }]);
    const currentBuilder = createSubqueryBuilder();
    const outerBuilder = createThenableQuery([
      {
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        image_url: "https://example.com/monarch.jpg",
        quantity: 12,
      },
    ]);
    const currentSubquery = {
      butterfly_species_id: sql<number>`"current_in_flight_by_species"."butterfly_species_id"`,
      quantity: sql<number>`"current_in_flight_by_species"."quantity"`,
    };

    currentBuilder.as.mockReturnValue(currentSubquery);
    mockSelect
      .mockReturnValueOnce(institutionBuilder)
      .mockReturnValueOnce(currentBuilder)
      .mockReturnValueOnce(outerBuilder);

    await expect(getInstitutionInFlightBySlug("some-slug")).resolves.toEqual([
      {
        scientific_name: "Danaus plexippus",
        common_name: "Monarch",
        image_url: "https://example.com/monarch.jpg",
        quantity: 12,
      },
    ]);

    const institutionWhereSql = toSql(
      (institutionBuilder.where.mock.calls as unknown as unknown[][])[0][0],
    );
    const currentWhereSql = toSql(
      (currentBuilder.where.mock.calls as unknown as unknown[][])[0][0],
    );
    const currentOverrideJoinSql = toSql(
      (currentBuilder.leftJoin.mock.calls as unknown as unknown[][])[0][1],
    );

    expect(institutionWhereSql).toContain('"institutions"."slug"');
    expect(institutionWhereSql).toContain('"institutions"."stats_active"');

    expect(currentWhereSql).toContain('"release_events"."release_date"');
    expect(currentWhereSql).toContain('"butterfly_species_institution"."lifespan_override"');
    expect(currentWhereSql).toContain('"butterfly_species"."lifespan_days"');
    expect(currentWhereSql).toContain("> now()");
    expect(currentWhereSql).toContain('"in_flight"."institution_id"');
    expect(currentOverrideJoinSql).toContain('"butterfly_species_institution"."institution_id"');

    expect(outerBuilder.from).toHaveBeenCalledWith(currentSubquery);
    expect(outerBuilder.innerJoin).toHaveBeenCalledTimes(1);
    expect(outerBuilder.leftJoin).toHaveBeenCalledTimes(1);
    expect(outerBuilder.orderBy).toHaveBeenCalledTimes(1);
  });

  it("returns null when the institution is missing or not publicly active", async () => {
    const institutionBuilder = createThenableQuery([]);

    mockSelect.mockReturnValueOnce(institutionBuilder);

    await expect(getInstitutionInFlightBySlug("missing-slug")).resolves.toBeNull();
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });
});
