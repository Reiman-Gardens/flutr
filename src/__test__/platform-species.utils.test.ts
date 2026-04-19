import {
  filterSpecies,
  formatRangeInput,
  normalizePlatformSpecies,
  parseRangeInput,
  toPlatformSpeciesSummary,
} from "@/components/platform/species/species.utils";

describe("platform species utils", () => {
  it("parses range input from new lines and commas without duplicates", () => {
    expect(parseRangeInput("North America\nCentral America, North America")).toEqual([
      "North America",
      "Central America",
    ]);
  });

  it("formats range input for textarea editing", () => {
    expect(formatRangeInput(["North America", "South America"])).toBe(
      "North America\nSouth America",
    );
  });

  it("filters species by multiple searchable fields", () => {
    const filtered = filterSpecies(
      [
        {
          id: 1,
          commonName: "Blue Morpho",
          scientificName: "Morpho peleides",
          family: "Nymphalidae",
          subFamily: "Morphinae",
          lifespanDays: 21,
          range: ["Central America"],
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          commonName: "Monarch",
          scientificName: "Danaus plexippus",
          family: "Nymphalidae",
          subFamily: "Danainae",
          lifespanDays: 28,
          range: ["North America"],
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      "central",
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.commonName).toBe("Blue Morpho");
  });

  it("normalizes platform species API records", () => {
    const normalized = normalizePlatformSpecies({
      id: 5,
      scientific_name: "Morpho peleides",
      common_name: "Blue Morpho",
      family: "Nymphalidae",
      sub_family: "Morphinae",
      lifespan_days: 21,
      range: ["Central America"],
      description: "Bright blue butterfly",
      host_plant: "Pea family plants",
      habitat: "Tropical forest",
      fun_facts: [{ title: "Wings", fact: "Reflective blue wings" }],
      img_wings_open: "https://example.com/open.jpg",
      img_wings_closed: "https://example.com/closed.jpg",
      extra_img_1: null,
      extra_img_2: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });

    expect(normalized.commonName).toBe("Blue Morpho");
    expect(normalized.subFamily).toBe("Morphinae");
    expect(toPlatformSpeciesSummary(normalized).scientificName).toBe("Morpho peleides");
  });
});
