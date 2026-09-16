import {
  prefixRegex,
  compileTerms,
  getField,
  matchPriority,
  matchesAllTerms,
  compareSpecies,
  sortSpecies,
  PRIORITY_ORDER,
  type SpeciesItem,
  type SortField,
  type SortDirection,
} from "@/hooks/use-species-search";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const monarch: SpeciesItem = {
  common_name: "Monarch",
  scientific_name: "Danaus plexippus",
  family: "Nymphalidae",
};

const paintedLady: SpeciesItem = {
  common_name: "Painted Lady",
  scientific_name: "Vanessa cardui",
  family: "Nymphalidae",
};

const swallowtail: SpeciesItem = {
  common_name: "Eastern Tiger Swallowtail",
  scientific_name: "Papilio glaucus",
  family: "Papilionidae",
};

const blueMorpho: SpeciesItem = {
  common_name: "Blue Morpho",
  scientific_name: "Morpho menelaus",
  family: "Nymphalidae",
};

const items: SpeciesItem[] = [monarch, paintedLady, swallowtail, blueMorpho];

// ---------------------------------------------------------------------------
// prefixRegex
// ---------------------------------------------------------------------------

describe("prefixRegex", () => {
  it("matches the start of a word (word boundary)", () => {
    const re = prefixRegex("mon");
    expect(re.test("Monarch")).toBe(true);
    expect(re.test("Common Monarch")).toBe(true);
  });

  it("is case-insensitive", () => {
    const re = prefixRegex("MON");
    expect(re.test("monarch")).toBe(true);
  });

  it("does not match mid-word", () => {
    const re = prefixRegex("arc");
    // "arc" does not start at a word boundary in "Monarch"
    expect(re.test("Monarch")).toBe(false);
  });

  it("escapes regex special characters", () => {
    const re = prefixRegex("a.b");
    expect(re.test("a.b test")).toBe(true);
    expect(re.test("axb test")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// compileTerms
// ---------------------------------------------------------------------------

describe("compileTerms", () => {
  it("returns an empty array for no terms", () => {
    expect(compileTerms([])).toEqual([]);
  });

  it("returns one regex per term", () => {
    const regexes = compileTerms(["mon", "nym"]);
    expect(regexes).toHaveLength(2);
    expect(regexes[0]).toBeInstanceOf(RegExp);
    expect(regexes[1]).toBeInstanceOf(RegExp);
  });
});

// ---------------------------------------------------------------------------
// getField
// ---------------------------------------------------------------------------

describe("getField", () => {
  it("returns common_name", () => {
    expect(getField(monarch, "common_name")).toBe("Monarch");
  });

  it("returns scientific_name", () => {
    expect(getField(monarch, "scientific_name")).toBe("Danaus plexippus");
  });

  it("returns family", () => {
    expect(getField(monarch, "family")).toBe("Nymphalidae");
  });

  it("falls back to common_name for non-text sort fields", () => {
    expect(getField(monarch, "in_flight")).toBe("Monarch");
  });
});

// ---------------------------------------------------------------------------
// matchesAllTerms
// ---------------------------------------------------------------------------

describe("matchesAllTerms", () => {
  it("returns true when all terms match across fields", () => {
    // "mon" matches common_name, "dan" matches scientific_name
    const regexes = compileTerms(["mon", "dan"]);
    expect(matchesAllTerms(monarch, regexes)).toBe(true);
  });

  it("returns false when a term matches no field", () => {
    const regexes = compileTerms(["mon", "zzz"]);
    expect(matchesAllTerms(monarch, regexes)).toBe(false);
  });

  it("returns true for empty regexes (no search)", () => {
    expect(matchesAllTerms(monarch, [])).toBe(true);
  });

  it("matches family field", () => {
    const regexes = compileTerms(["nym"]);
    expect(matchesAllTerms(monarch, regexes)).toBe(true);
    expect(matchesAllTerms(swallowtail, regexes)).toBe(false);
  });

  it("performs AND logic across terms", () => {
    // "painted" matches common_name, "cardui" matches scientific_name
    const regexes = compileTerms(["painted", "cardui"]);
    expect(matchesAllTerms(paintedLady, regexes)).toBe(true);
    // "painted" does not match monarch
    expect(matchesAllTerms(monarch, regexes)).toBe(false);
  });

  it("handles items with empty string fields", () => {
    const empty: SpeciesItem = { common_name: "", scientific_name: "", family: "" };
    const regexes = compileTerms(["anything"]);
    expect(matchesAllTerms(empty, regexes)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchPriority
// ---------------------------------------------------------------------------

describe("matchPriority", () => {
  const defaultOrder = PRIORITY_ORDER.common_name;

  it("returns 0 when all terms match the first priority field", () => {
    const regexes = compileTerms(["mon"]);
    expect(matchPriority(monarch, regexes, defaultOrder)).toBe(0);
  });

  it("returns 1 when match is only in scientific_name", () => {
    const regexes = compileTerms(["dan"]);
    expect(matchPriority(monarch, regexes, defaultOrder)).toBe(1);
  });

  it("returns 2 when match is only in family", () => {
    const regexes = compileTerms(["nym"]);
    expect(matchPriority(monarch, regexes, defaultOrder)).toBe(2);
  });

  it("returns Infinity when no single field matches all terms", () => {
    // "mon" matches common_name, "dan" matches scientific_name — no single field has both
    const regexes = compileTerms(["mon", "dan"]);
    expect(matchPriority(monarch, regexes, defaultOrder)).toBe(Infinity);
  });

  it("respects custom priority order", () => {
    const sciOrder = PRIORITY_ORDER.scientific_name;
    const regexes = compileTerms(["dan"]);
    // "dan" matches scientific_name which is now index 0
    expect(matchPriority(monarch, regexes, sciOrder)).toBe(0);
  });

  it("handles multi-word terms in a single field", () => {
    // "eastern tiger" both match as word prefixes in "Eastern Tiger Swallowtail"
    const regexes = compileTerms(["eastern", "tiger"]);
    expect(matchPriority(swallowtail, regexes, defaultOrder)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sortSpecies / compareSpecies — Gallery sort configurations
//
// Fixtures below mirror the shape GalleryContent passes into useSpeciesSearch: an
// already-eligible (in_flight_count > 0) species set. Population selection is a separate
// concern from sorting — sortSpecies/compareSpecies are order-only and never add or remove
// species (see gallery-population.test.ts for the population rule itself), so every fixture
// here is intentionally already eligible.
//
// The 8 field/direction pairs below are the exact field/direction values used by
// GALLERY_SORT_OPTIONS in src/components/public/gallery/gallery-content.tsx (In Flight
// High-Low/Low-High, Name A-Z/Z-A, Scientific A-Z/Z-A, Family A-Z/Z-A) — the full cross
// product of SortField x SortDirection.
// ---------------------------------------------------------------------------

interface GallerySpeciesFixture extends SpeciesItem {
  id: string;
  in_flight_count: number;
}

describe("sortSpecies (Gallery sort configurations)", () => {
  // Values chosen so common_name, scientific_name, family, and in_flight_count each
  // produce a distinct total order — no ties to obscure a wrong-field bug.
  const zebraLongwing: GallerySpeciesFixture = {
    id: "zebra-longwing",
    common_name: "Zebra Longwing",
    scientific_name: "Heliconius charithonia",
    family: "Nymphalidae",
    in_flight_count: 12,
  };
  const blueMorphoFixture: GallerySpeciesFixture = {
    id: "blue-morpho",
    common_name: "Blue Morpho",
    scientific_name: "Morpho peleides",
    family: "Lycaenidae",
    in_flight_count: 3,
  };
  const giantSwallowtail: GallerySpeciesFixture = {
    id: "giant-swallowtail",
    common_name: "Giant Swallowtail",
    scientific_name: "Papilio cresphontes",
    family: "Papilionidae",
    in_flight_count: 27,
  };
  const atlasMoth: GallerySpeciesFixture = {
    id: "atlas-moth",
    common_name: "Atlas Moth",
    scientific_name: "Attacus atlas",
    family: "Saturniidae",
    in_flight_count: 8,
  };

  const gallerySpecies: GallerySpeciesFixture[] = [
    zebraLongwing,
    blueMorphoFixture,
    giantSwallowtail,
    atlasMoth,
  ];

  const getNumericField = (item: GallerySpeciesFixture, field: SortField): number | undefined =>
    field === "in_flight" ? item.in_flight_count : undefined;

  const idsOf = (list: GallerySpeciesFixture[]) => list.map((s) => s.id);

  it("sorts In Flight (High–Low): in_flight desc", () => {
    const result = sortSpecies(gallerySpecies, "in_flight", "desc", getNumericField);
    expect(idsOf(result)).toEqual([
      "giant-swallowtail",
      "zebra-longwing",
      "atlas-moth",
      "blue-morpho",
    ]);
  });

  it("sorts In Flight (Low–High): in_flight asc", () => {
    const result = sortSpecies(gallerySpecies, "in_flight", "asc", getNumericField);
    expect(idsOf(result)).toEqual([
      "blue-morpho",
      "atlas-moth",
      "zebra-longwing",
      "giant-swallowtail",
    ]);
  });

  it("sorts Name (A–Z): common_name asc", () => {
    const result = sortSpecies(gallerySpecies, "common_name", "asc");
    expect(idsOf(result)).toEqual([
      "atlas-moth",
      "blue-morpho",
      "giant-swallowtail",
      "zebra-longwing",
    ]);
  });

  it("sorts Name (Z–A): common_name desc", () => {
    const result = sortSpecies(gallerySpecies, "common_name", "desc");
    expect(idsOf(result)).toEqual([
      "zebra-longwing",
      "giant-swallowtail",
      "blue-morpho",
      "atlas-moth",
    ]);
  });

  it("sorts Scientific (A–Z): scientific_name asc", () => {
    const result = sortSpecies(gallerySpecies, "scientific_name", "asc");
    expect(idsOf(result)).toEqual([
      "atlas-moth",
      "zebra-longwing",
      "blue-morpho",
      "giant-swallowtail",
    ]);
  });

  it("sorts Scientific (Z–A): scientific_name desc", () => {
    const result = sortSpecies(gallerySpecies, "scientific_name", "desc");
    expect(idsOf(result)).toEqual([
      "giant-swallowtail",
      "blue-morpho",
      "zebra-longwing",
      "atlas-moth",
    ]);
  });

  it("sorts Family (A–Z): family asc", () => {
    const result = sortSpecies(gallerySpecies, "family", "asc");
    expect(idsOf(result)).toEqual([
      "blue-morpho",
      "zebra-longwing",
      "giant-swallowtail",
      "atlas-moth",
    ]);
  });

  it("sorts Family (Z–A): family desc", () => {
    const result = sortSpecies(gallerySpecies, "family", "desc");
    expect(idsOf(result)).toEqual([
      "atlas-moth",
      "giant-swallowtail",
      "zebra-longwing",
      "blue-morpho",
    ]);
  });

  it("never drops a species or changes the result count — sorting is order-only", () => {
    const fields: SortField[] = ["common_name", "scientific_name", "family", "in_flight"];
    const directions: SortDirection[] = ["asc", "desc"];

    for (const field of fields) {
      for (const direction of directions) {
        const result = sortSpecies(gallerySpecies, field, direction, getNumericField);
        expect(result).toHaveLength(gallerySpecies.length);
        expect(new Set(idsOf(result))).toEqual(new Set(idsOf(gallerySpecies)));
        // Sorting must never perform population selection — that is a separate concern
        // (selectGalleryPopulation). Every fixture here is already in_flight_count > 0.
        expect(result.every((s) => s.in_flight_count > 0)).toBe(true);
      }
    }
  });

  it("does not mutate the input array", () => {
    const original = [...gallerySpecies];
    sortSpecies(gallerySpecies, "common_name", "desc");
    expect(gallerySpecies).toEqual(original);
  });
});

describe("compareSpecies", () => {
  it("falls back to text comparison when getNumericField is not provided for a numeric field", () => {
    const a: SpeciesItem = { common_name: "Alpha", scientific_name: "A", family: "Fam" };
    const b: SpeciesItem = { common_name: "Beta", scientific_name: "B", family: "Fam" };
    // No getNumericField passed — compareSpecies must not throw and must fall back
    // to a defined comparison (getField falls back to common_name for "in_flight").
    expect(compareSpecies(a, b, "in_flight", "asc")).toBeLessThan(0);
  });

  it("tie-breaks equal numeric values by common_name ascending", () => {
    const a: GallerySpeciesFixture = {
      id: "a",
      common_name: "Zeta",
      scientific_name: "Z",
      family: "Fam",
      in_flight_count: 5,
    };
    const b: GallerySpeciesFixture = {
      id: "b",
      common_name: "Alpha",
      scientific_name: "A",
      family: "Fam",
      in_flight_count: 5,
    };
    const getNumericField = (item: GallerySpeciesFixture) => item.in_flight_count;
    // Equal in_flight_count — tie-break falls back to common_name asc regardless of
    // the requested sort direction.
    expect(compareSpecies(a, b, "in_flight", "desc", getNumericField)).toBeGreaterThan(0);
    expect(compareSpecies(b, a, "in_flight", "desc", getNumericField)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: filtering + sorting logic (testing the pure functions together)
// ---------------------------------------------------------------------------

describe("search pipeline (filter + sort)", () => {
  function filterAndSort(
    allItems: SpeciesItem[],
    query: string,
    families: string[],
    sortField: SortField = "common_name",
    sortDirection: "asc" | "desc" = "asc",
  ): SpeciesItem[] {
    let filtered = allItems;

    if (families.length > 0) {
      filtered = filtered.filter((s) => families.includes(s.family));
    }

    const trimmed = query.trim();
    const terms = trimmed ? trimmed.split(/\s+/) : [];
    const regexes = compileTerms(terms);

    if (regexes.length > 0) {
      filtered = filtered.filter((s) => matchesAllTerms(s, regexes));
    }

    const dir = sortDirection === "asc" ? 1 : -1;
    const compare = (a: SpeciesItem, b: SpeciesItem) => {
      const aVal = getField(a, sortField).toLowerCase();
      const bVal = getField(b, sortField).toLowerCase();
      return aVal.localeCompare(bVal) * dir;
    };

    if (regexes.length > 0) {
      const order = PRIORITY_ORDER[sortField];
      return [...filtered].sort((a, b) => {
        const pa = matchPriority(a, regexes, order);
        const pb = matchPriority(b, regexes, order);
        if (pa !== pb) return pa - pb;
        return compare(a, b);
      });
    }

    return [...filtered].sort(compare);
  }

  it("sorts alphabetically by common_name ascending by default", () => {
    const result = filterAndSort(items, "", []);
    expect(result.map((s) => s.common_name)).toEqual([
      "Blue Morpho",
      "Eastern Tiger Swallowtail",
      "Monarch",
      "Painted Lady",
    ]);
  });

  it("sorts by common_name descending", () => {
    const result = filterAndSort(items, "", [], "common_name", "desc");
    expect(result.map((s) => s.common_name)).toEqual([
      "Painted Lady",
      "Monarch",
      "Eastern Tiger Swallowtail",
      "Blue Morpho",
    ]);
  });

  it("sorts by scientific_name", () => {
    const result = filterAndSort(items, "", [], "scientific_name", "asc");
    expect(result.map((s) => s.scientific_name)).toEqual([
      "Danaus plexippus",
      "Morpho menelaus",
      "Papilio glaucus",
      "Vanessa cardui",
    ]);
  });

  it("filters by family", () => {
    const result = filterAndSort(items, "", ["Papilionidae"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(swallowtail);
  });

  it("filters by multiple families", () => {
    const result = filterAndSort(items, "", ["Nymphalidae"]);
    expect(result).toHaveLength(3);
    expect(result.every((s) => s.family === "Nymphalidae")).toBe(true);
  });

  it("filters by search query", () => {
    const result = filterAndSort(items, "morpho", []);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(blueMorpho);
  });

  it("combines family filter and search query", () => {
    const result = filterAndSort(items, "mon", ["Nymphalidae"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(monarch);
  });

  it("returns empty when search matches nothing", () => {
    const result = filterAndSort(items, "zzz", []);
    expect(result).toHaveLength(0);
  });

  it("returns empty when family filter matches nothing", () => {
    const result = filterAndSort(items, "", ["Pieridae"]);
    expect(result).toHaveLength(0);
  });

  it("ranks common_name match first, then sorts alphabetically within tier", () => {
    // "mo" matches "Monarch" (common_name) and "Blue Morpho" (common_name has "Morpho")
    // Both match at priority 0 (common_name), so they sort alphabetically
    const result = filterAndSort(items, "mo", []);
    const names = result.map((s) => s.common_name);
    expect(names).toEqual(["Blue Morpho", "Monarch"]);
  });

  it("ranks scientific_name match below common_name match", () => {
    // "pap" matches "Papilio glaucus" (scientific_name) and "Papilionidae" (family)
    // Swallowtail matches scientific_name at priority 1 with common_name order
    const result = filterAndSort(items, "pap", []);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(swallowtail);
  });

  it("handles empty items array", () => {
    const result = filterAndSort([], "anything", []);
    expect(result).toHaveLength(0);
  });

  it("handles whitespace-only search query", () => {
    const result = filterAndSort(items, "   ", []);
    expect(result).toHaveLength(4);
  });

  it("handles pagination slicing correctly", () => {
    const result = filterAndSort(items, "", []);
    const page1 = result.slice(0, 2);
    const page2 = result.slice(0, 4);
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(4);
    expect(page2.slice(0, 2)).toEqual(page1);
  });
});
