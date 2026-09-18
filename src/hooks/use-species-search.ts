import { useMemo, useState, useCallback } from "react";

export type SortField = "common_name" | "scientific_name" | "family" | "in_flight";
export type SortDirection = "asc" | "desc";

export interface SpeciesItem {
  scientific_name: string;
  common_name: string;
  family: string;
}

export interface UseSpeciesSearchOptions<T extends SpeciesItem> {
  items: T[];
  pageSize?: number;
  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
  initialQuery?: string;
  initialFamilies?: string[];
  initialVisibleCount?: number;
  /** Numeric field accessor for custom sort fields like in_flight. */
  getNumericField?: (item: T, field: SortField) => number | undefined;
  /**
   * Optional population scope: decides which items are eligible at all, given the
   * currently-selected sort field, before families are derived and before family/search
   * filtering and sorting run. Generic — this hook has no opinion on what the rule is; the
   * caller supplies it. When omitted, all items are eligible (existing behavior, unchanged).
   */
  selectItems?: (items: T[], sortField: SortField) => T[];
}

export interface UseSpeciesSearchReturn<T extends SpeciesItem> {
  query: string;
  sortField: SortField;
  sortDirection: SortDirection;
  activeFamilies: string[];
  families: string[];
  results: T[];
  visibleResults: T[];
  totalCount: number;
  visibleCount: number;
  hasMore: boolean;
  setQuery: (q: string) => void;
  setSort: (field: SortField, direction: SortDirection) => void;
  setActiveFamilies: (families: string[]) => void;
  loadMore: () => void;
  resetAll: () => void;
}

const DEFAULT_PAGE_SIZE = 12;

/** Text-based sort fields used for search-match ranking. */
const TEXT_SORT_FIELDS: SortField[] = ["common_name", "scientific_name", "family"];

/**
 * Priority order for search-match ranking, based on the active sort field.
 * The field being sorted on is ranked first for relevance.
 */
export const PRIORITY_ORDER: Record<SortField, SortField[]> = {
  common_name: ["common_name", "scientific_name", "family"],
  scientific_name: ["scientific_name", "common_name", "family"],
  family: ["family", "common_name", "scientific_name"],
  in_flight: ["common_name", "scientific_name", "family"],
};

/** Build a regex matching the start of any word (prefix match). */
export function prefixRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`, "i");
}

/** Pre-compile an array of prefix regexes from search terms. */
export function compileTerms(terms: string[]): RegExp[] {
  return terms.map(prefixRegex);
}

/** Get the value of a text sort field from a species item. */
export function getField(item: SpeciesItem, field: SortField): string {
  switch (field) {
    case "common_name":
      return item.common_name;
    case "scientific_name":
      return item.scientific_name;
    case "family":
      return item.family;
    default:
      return item.common_name;
  }
}

/**
 * Return the highest-priority field index (0 = best) where ALL search terms
 * match as word prefixes. Returns Infinity if no single field matches all terms.
 */
export function matchPriority(item: SpeciesItem, regexes: RegExp[], order: SortField[]): number {
  for (let i = 0; i < order.length; i++) {
    const value = getField(item, order[i]);
    if (regexes.every((re) => re.test(value))) {
      return i;
    }
  }
  return Infinity;
}

/** Check if an item matches all search terms across any combination of name fields. */
export function matchesAllTerms<T extends SpeciesItem>(item: T, regexes: RegExp[]): boolean {
  return regexes.every((re) => {
    return re.test(item.common_name) || re.test(item.scientific_name) || re.test(item.family);
  });
}

/**
 * Compare two species items for sorting by the given field/direction.
 * Numeric fields (e.g. "in_flight") use getNumericField and tie-break by common_name
 * ascending; text fields compare case-insensitively. This is the single source of
 * sort-order truth for useSpeciesSearch — do not duplicate this logic elsewhere.
 */
export function compareSpecies<T extends SpeciesItem>(
  a: T,
  b: T,
  field: SortField,
  direction: SortDirection,
  getNumericField?: (item: T, field: SortField) => number | undefined,
): number {
  const dir = direction === "asc" ? 1 : -1;
  const isTextSort = TEXT_SORT_FIELDS.includes(field);

  if (!isTextSort && getNumericField) {
    const aNum = getNumericField(a, field) ?? 0;
    const bNum = getNumericField(b, field) ?? 0;
    if (aNum !== bNum) return (aNum - bNum) * dir;
    // Tie-break by common_name asc
    return a.common_name.toLowerCase().localeCompare(b.common_name.toLowerCase());
  }
  const aVal = getField(a, field).toLowerCase();
  const bVal = getField(b, field).toLowerCase();
  return aVal.localeCompare(bVal) * dir;
}

/** Sort a list of species items by the given field/direction, using compareSpecies. */
export function sortSpecies<T extends SpeciesItem>(
  items: T[],
  field: SortField,
  direction: SortDirection,
  getNumericField?: (item: T, field: SortField) => number | undefined,
): T[] {
  return [...items].sort((a, b) => compareSpecies(a, b, field, direction, getNumericField));
}

export function useSpeciesSearch<T extends SpeciesItem>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  defaultSortField = "common_name",
  defaultSortDirection = "asc",
  initialQuery = "",
  initialFamilies = [],
  initialVisibleCount,
  getNumericField,
  selectItems,
}: UseSpeciesSearchOptions<T>): UseSpeciesSearchReturn<T> {
  const [query, setQuery] = useState(initialQuery);
  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [activeFamilies, setActiveFamilies] = useState<string[]>(initialFamilies);
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount ?? pageSize);

  // Population scope: which items are eligible at all, given the current sort field. Optional
  // and generic — when selectItems isn't supplied, all items remain eligible (unchanged
  // behavior). This uses the hook's own authoritative sortField, so there is no separate/
  // mirrored sort state anywhere.
  const scopedItems = useMemo(
    () => (selectItems ? selectItems(items, sortField) : items),
    [items, sortField, selectItems],
  );

  // Extract distinct sorted family names — derived from the scoped population, not raw items,
  // so the Filters dialog reflects whichever population is currently active.
  const families = useMemo(() => {
    const set = new Set(scopedItems.map((s) => s.family));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scopedItems]);

  // Reset pagination when filters change
  const handleSetQuery = useCallback(
    (q: string) => {
      setQuery(q);
      setVisibleCount(pageSize);
    },
    [pageSize],
  );

  const handleSetSort = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
      setVisibleCount(pageSize);
    },
    [pageSize],
  );

  const handleSetActiveFamilies = useCallback(
    (fams: string[]) => {
      setActiveFamilies(fams);
      setVisibleCount(pageSize);
    },
    [pageSize],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize);
  }, [pageSize]);

  const resetAll = useCallback(() => {
    setQuery("");
    setSortField(defaultSortField);
    setSortDirection(defaultSortDirection);
    setActiveFamilies([]);
    setVisibleCount(pageSize);
  }, [defaultSortField, defaultSortDirection, pageSize]);

  // Population → filter → sort → prioritize
  const results = useMemo(() => {
    let filtered = scopedItems;

    // Family filter
    if (activeFamilies.length > 0) {
      filtered = filtered.filter((s) => activeFamilies.includes(s.family));
    }

    // Search filter (word-prefix matching, AND across terms)
    const trimmed = query.trim();
    const terms = trimmed ? trimmed.split(/\s+/) : [];
    const regexes = compileTerms(terms);

    if (regexes.length > 0) {
      filtered = filtered.filter((s) => matchesAllTerms(s, regexes));
    }

    // With an active search query, sort by priority tier first, then by sort field within tiers
    if (regexes.length > 0) {
      const order = PRIORITY_ORDER[sortField];
      return [...filtered].sort((a, b) => {
        const pa = matchPriority(a, regexes, order);
        const pb = matchPriority(b, regexes, order);
        if (pa !== pb) return pa - pb;
        return compareSpecies(a, b, sortField, sortDirection, getNumericField);
      });
    }

    return sortSpecies(filtered, sortField, sortDirection, getNumericField);
  }, [scopedItems, activeFamilies, query, sortField, sortDirection, getNumericField]);

  const visibleResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);

  return {
    query,
    sortField,
    sortDirection,
    activeFamilies,
    families,
    results,
    visibleResults,
    totalCount: results.length,
    visibleCount: Math.min(visibleCount, results.length),
    hasMore: visibleCount < results.length,
    setQuery: handleSetQuery,
    setSort: handleSetSort,
    setActiveFamilies: handleSetActiveFamilies,
    loadMore,
    resetAll,
  };
}
