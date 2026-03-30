import { transformStatsData, type StatsSpeciesRow } from "@/lib/queries/stats";

function makeRow(overrides: Partial<StatsSpeciesRow> = {}): StatsSpeciesRow {
  return {
    scientific_name: "Danaus plexippus",
    common_name: "Monarch",
    family: "Nymphalidae",
    sub_family: "Danainae",
    range: ["North America"],
    lifespan_days: 14,
    img_wings_open: null,
    quantity: 10,
    ...overrides,
  };
}

describe("transformStatsData", () => {
  it("returns zeroed data for empty rows", () => {
    const result = transformStatsData([]);

    expect(result.totalButterflies).toBe(0);
    expect(result.totalSpecies).toBe(0);
    expect(result.uniqueFamilies).toBe(0);
    expect(result.averageLifespan).toBe(0);
    expect(result.speciesBreakdown).toEqual([]);
    expect(result.familyDistribution).toEqual([]);
    expect(result.regionDistribution).toEqual([]);
  });

  it("computes correct totals for a single species", () => {
    const result = transformStatsData([makeRow({ quantity: 5, lifespan_days: 20 })]);

    expect(result.totalButterflies).toBe(5);
    expect(result.totalSpecies).toBe(1);
    expect(result.uniqueFamilies).toBe(1);
    expect(result.averageLifespan).toBe(20);
  });

  it("computes weighted average lifespan", () => {
    const rows = [
      makeRow({ scientific_name: "A", quantity: 10, lifespan_days: 10 }),
      makeRow({ scientific_name: "B", quantity: 30, lifespan_days: 30 }),
    ];
    const result = transformStatsData(rows);

    // Weighted: (10*10 + 30*30) / 40 = 1000/40 = 25
    expect(result.averageLifespan).toBe(25);
  });

  it("sorts speciesBreakdown by quantity descending", () => {
    const rows = [
      makeRow({ scientific_name: "A", common_name: "A", quantity: 5 }),
      makeRow({ scientific_name: "B", common_name: "B", quantity: 20 }),
      makeRow({ scientific_name: "C", common_name: "C", quantity: 10 }),
    ];
    const result = transformStatsData(rows);

    expect(result.speciesBreakdown.map((s) => s.name)).toEqual(["B", "C", "A"]);
  });

  it("groups families exceeding MAX_FAMILIES_SHOWN into Other", () => {
    const families = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"];
    const rows = families.map((f, i) =>
      makeRow({
        scientific_name: `species-${i}`,
        family: f,
        quantity: 100 - i * 10,
      }),
    );
    const result = transformStatsData(rows);

    // MAX_FAMILIES_SHOWN = 6 (unexported constant in stats.ts)
    // 6 named + "Other" bucket
    expect(result.familyDistribution.length).toBe(7);
    expect(result.familyDistribution[6].name).toBe("Other");
    // "Other" = F7 (40) + F8 (30) = 70
    expect(result.familyDistribution[6].value).toBe(70);
  });

  it("does not add Other when families fit within limit", () => {
    const rows = [
      makeRow({ scientific_name: "A", family: "F1", quantity: 10 }),
      makeRow({ scientific_name: "B", family: "F2", quantity: 5 }),
    ];
    const result = transformStatsData(rows);

    expect(result.familyDistribution.every((f) => f.name !== "Other")).toBe(true);
  });

  it("aggregates region distribution across species", () => {
    const rows = [
      makeRow({ scientific_name: "A", range: ["Asia", "Africa"] }),
      makeRow({ scientific_name: "B", range: ["Asia", "Europe"] }),
      makeRow({ scientific_name: "C", range: ["Africa"] }),
    ];
    const result = transformStatsData(rows);

    const asiaEntry = result.regionDistribution.find((r) => r.name === "Asia");
    const africaEntry = result.regionDistribution.find((r) => r.name === "Africa");
    const europeEntry = result.regionDistribution.find((r) => r.name === "Europe");

    expect(asiaEntry?.count).toBe(2);
    expect(africaEntry?.count).toBe(2);
    expect(europeEntry?.count).toBe(1);
  });

  it("sorts regions by count descending", () => {
    const rows = [
      makeRow({ scientific_name: "A", range: ["Europe"] }),
      makeRow({ scientific_name: "B", range: ["Asia", "Europe"] }),
      makeRow({ scientific_name: "C", range: ["Asia", "Europe", "Africa"] }),
    ];
    const result = transformStatsData(rows);

    expect(result.regionDistribution.map((r) => r.name)).toEqual(["Europe", "Asia", "Africa"]);
  });

  it("trims and skips empty region strings", () => {
    const rows = [makeRow({ range: ["  Asia  ", "", "  "] })];
    const result = transformStatsData(rows);

    expect(result.regionDistribution).toEqual([{ name: "Asia", count: 1 }]);
  });
});
