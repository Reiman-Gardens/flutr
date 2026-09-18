import {
  filterSpecies,
  hasOverride,
  resolveCommonName,
  resolveLifespan,
  type TenantSpeciesSummary,
} from "@/components/tenant/species/species.utils";

function makeSpecies(overrides: Partial<TenantSpeciesSummary> = {}): TenantSpeciesSummary {
  return {
    id: 1,
    scientificName: "Danaus plexippus",
    family: "Nymphalidae",
    subFamily: "Danainae",
    range: ["North America", "Central America"],
    commonName: "Monarch Butterfly",
    commonNameOverride: null,
    lifespanDays: 30,
    lifespanOverride: null,
    isLinked: true,
    ...overrides,
  };
}

describe("resolveCommonName", () => {
  it("falls back to the catalog name when there is no override", () => {
    expect(resolveCommonName(makeSpecies())).toBe("Monarch Butterfly");
  });

  it("prefers the override when present", () => {
    expect(resolveCommonName(makeSpecies({ commonNameOverride: "Exhibit Monarch" }))).toBe(
      "Exhibit Monarch",
    );
  });

  it("treats an empty override as absent so a blank name never renders", () => {
    expect(resolveCommonName(makeSpecies({ commonNameOverride: "" }))).toBe("Monarch Butterfly");
    expect(resolveCommonName(makeSpecies({ commonNameOverride: "   " }))).toBe("Monarch Butterfly");
  });
});

describe("resolveLifespan", () => {
  it("falls back to the catalog lifespan when there is no override", () => {
    expect(resolveLifespan(makeSpecies())).toBe(30);
  });

  it("prefers the override when present", () => {
    expect(resolveLifespan(makeSpecies({ lifespanOverride: 5 }))).toBe(5);
  });

  it("ignores a non-positive override", () => {
    expect(resolveLifespan(makeSpecies({ lifespanOverride: 0 }))).toBe(30);
  });
});

describe("hasOverride", () => {
  it("is false when neither field is customized", () => {
    expect(hasOverride(makeSpecies())).toBe(false);
    expect(hasOverride(makeSpecies({ commonNameOverride: "  " }))).toBe(false);
  });

  it("is true when either field is customized", () => {
    expect(hasOverride(makeSpecies({ commonNameOverride: "Exhibit Monarch" }))).toBe(true);
    expect(hasOverride(makeSpecies({ lifespanOverride: 5 }))).toBe(true);
  });
});

describe("filterSpecies", () => {
  const monarch = makeSpecies({ id: 1, isLinked: true });
  const morpho = makeSpecies({
    id: 2,
    scientificName: "Morpho peleides",
    commonName: "Blue Morpho",
    family: "Nymphalidae",
    subFamily: "Satyrinae",
    range: ["South America"],
    isLinked: false,
  });
  const swallowtail = makeSpecies({
    id: 3,
    scientificName: "Papilio glaucus",
    commonName: "Tiger Swallowtail",
    family: "Papilionidae",
    subFamily: "Papilioninae",
    range: ["North America"],
    isLinked: true,
  });
  const all = [swallowtail, monarch, morpho];

  it('keeps only carried species in the "mine" scope', () => {
    expect(filterSpecies(all, "", "mine").map((s) => s.id)).toEqual([1, 3]);
  });

  it('keeps every species in the "all" scope', () => {
    expect(filterSpecies(all, "", "all").map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it("sorts by scientific name", () => {
    expect(filterSpecies(all, "", "all").map((s) => s.scientificName)).toEqual([
      "Danaus plexippus",
      "Morpho peleides",
      "Papilio glaucus",
    ]);
  });

  it("searches case-insensitively across names, classification and range", () => {
    expect(filterSpecies(all, "morpho", "all").map((s) => s.id)).toEqual([2]);
    expect(filterSpecies(all, "papilionidae", "all").map((s) => s.id)).toEqual([3]);
    expect(filterSpecies(all, "south america", "all").map((s) => s.id)).toEqual([2]);
    expect(filterSpecies(all, "satyrinae", "all").map((s) => s.id)).toEqual([2]);
  });

  it("searches the overridden name as well as the catalog name", () => {
    const renamed = makeSpecies({ id: 4, commonNameOverride: "Exhibit Wanderer" });

    expect(filterSpecies([renamed], "wanderer", "all").map((s) => s.id)).toEqual([4]);
    expect(filterSpecies([renamed], "monarch", "all").map((s) => s.id)).toEqual([4]);
  });

  it("applies scope and search together", () => {
    expect(filterSpecies(all, "nymphalidae", "mine").map((s) => s.id)).toEqual([1]);
    expect(filterSpecies(all, "nymphalidae", "all").map((s) => s.id)).toEqual([1, 2]);
  });

  it("does not mutate the input array", () => {
    const input = [...all];
    filterSpecies(input, "", "all");
    expect(input.map((s) => s.id)).toEqual([3, 1, 2]);
  });
});
