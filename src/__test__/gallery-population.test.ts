import { selectGalleryPopulation } from "@/components/public/gallery/gallery-population";
import type { GallerySpecies } from "@/lib/queries/gallery";

// ---------------------------------------------------------------------------
// Fixtures — one institution's historical species population.
//
// Deliberately NOT in alphabetical order by common_name, scientific_name, or family, so tests
// can prove selectGalleryPopulation preserves input order rather than sorting (that's
// sortSpecies/compareSpecies's job, tested separately in use-species-search.test.ts).
//
// in_flight_count: zebraLongwing=8, blueMorpho=2, atlasMoth=0, giantSwallowtail=0
// ---------------------------------------------------------------------------

const zebraLongwing: GallerySpecies = {
  id: 1,
  common_name: "Zebra Longwing",
  scientific_name: "Heliconius charithonia",
  family: "Nymphalidae",
  range: ["North America"],
  img_wings_open: "https://example.com/zebra.jpg",
  in_flight_count: 8,
};

const blueMorpho: GallerySpecies = {
  id: 2,
  common_name: "Blue Morpho",
  scientific_name: "Morpho peleides",
  family: "Nymphalidae",
  range: ["South America"],
  img_wings_open: "https://example.com/morpho.jpg",
  in_flight_count: 2,
};

const atlasMoth: GallerySpecies = {
  id: 3,
  common_name: "Atlas Moth",
  scientific_name: "Attacus atlas",
  family: "Saturniidae",
  range: ["Asia"],
  img_wings_open: null,
  in_flight_count: 0,
};

const giantSwallowtail: GallerySpecies = {
  id: 4,
  common_name: "Giant Swallowtail",
  scientific_name: "Papilio cresphontes",
  family: "Papilionidae",
  range: ["North America"],
  img_wings_open: "https://example.com/swallowtail.jpg",
  in_flight_count: 0,
};

const institutionSpecies: GallerySpecies[] = [
  zebraLongwing,
  blueMorpho,
  atlasMoth,
  giantSwallowtail,
];

describe("selectGalleryPopulation", () => {
  it("excludes zero-count species for the in_flight sort field", () => {
    const result = selectGalleryPopulation(institutionSpecies, "in_flight");
    expect(result).toEqual([zebraLongwing, blueMorpho]);
  });

  it("only includes positive in_flight_count species for in_flight", () => {
    const result = selectGalleryPopulation(institutionSpecies, "in_flight");
    expect(result.every((s) => s.in_flight_count > 0)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("preserves the full population for common_name", () => {
    const result = selectGalleryPopulation(institutionSpecies, "common_name");
    expect(result).toEqual(institutionSpecies);
  });

  it("preserves the full population for scientific_name", () => {
    const result = selectGalleryPopulation(institutionSpecies, "scientific_name");
    expect(result).toEqual(institutionSpecies);
  });

  it("preserves the full population for family", () => {
    const result = selectGalleryPopulation(institutionSpecies, "family");
    expect(result).toEqual(institutionSpecies);
  });

  it("does not sort — preserves input order rather than alphabetizing", () => {
    // Alphabetical by common_name would be Atlas, Blue, Giant, Zebra — different from the
    // fixture's deliberately non-alphabetical input order. If this ever alphabetizes, this
    // assertion catches the population rule doing sorting's job.
    const result = selectGalleryPopulation(institutionSpecies, "common_name");
    expect(result.map((s) => s.common_name)).toEqual([
      "Zebra Longwing",
      "Blue Morpho",
      "Atlas Moth",
      "Giant Swallowtail",
    ]);
  });

  it("preserves relative order within the in_flight-filtered result", () => {
    const result = selectGalleryPopulation(institutionSpecies, "in_flight");
    // zebraLongwing appears before blueMorpho in the input; that relative order must survive
    // filtering (filter, unlike sort, never reorders).
    expect(result.map((s) => s.common_name)).toEqual(["Zebra Longwing", "Blue Morpho"]);
  });

  it("does not mutate the input array", () => {
    const original = [...institutionSpecies];
    selectGalleryPopulation(institutionSpecies, "in_flight");
    selectGalleryPopulation(institutionSpecies, "common_name");
    expect(institutionSpecies).toEqual(original);
  });

  it("returns an empty array for empty input, for every sort field", () => {
    const fields: Array<Parameters<typeof selectGalleryPopulation>[1]> = [
      "in_flight",
      "common_name",
      "scientific_name",
      "family",
    ];
    for (const field of fields) {
      expect(selectGalleryPopulation([], field)).toEqual([]);
    }
  });
});
