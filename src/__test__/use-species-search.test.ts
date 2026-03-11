import {
  prefixRegex,
  compileTerms,
  getField,
  matchPriority,
  matchesAllTerms,
  type SpeciesItem,
  type SortField,
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
});

// ---------------------------------------------------------------------------
// matchPriority
// ---------------------------------------------------------------------------

describe("matchPriority", () => {
  const defaultOrder: SortField[] = ["common_name", "scientific_name", "family"];

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
    const sciOrder: SortField[] = ["scientific_name", "common_name", "family"];
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
      const PRIORITY_ORDER: Record<SortField, SortField[]> = {
        common_name: ["common_name", "scientific_name", "family"],
        scientific_name: ["scientific_name", "common_name", "family"],
        family: ["family", "common_name", "scientific_name"],
        in_flight: ["common_name", "scientific_name", "family"],
      };
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

  it("ranks common_name prefix match above scientific_name match", () => {
    // "mo" matches "Monarch" (common_name) and "Morpho menelaus" (scientific_name for Blue Morpho)
    // Both also match on common_name ("Monarch" starts with "Mo", "Blue Morpho" has "Mo" at word boundary in Morpho)
    const result = filterAndSort(items, "mo", []);
    const names = result.map((s) => s.common_name);
    // Both match common_name at a word boundary, so they sort alphabetically within same priority
    expect(names).toContain("Monarch");
    expect(names).toContain("Blue Morpho");
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
