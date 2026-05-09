"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSpeciesSearch, type SortField, type SortDirection } from "@/hooks/use-species-search";
import {
  SpeciesSearchToolbar,
  type SpeciesFilters,
  type SortOption,
} from "@/components/shared/species-search-toolbar";
import type { GallerySpecies } from "@/lib/queries/gallery";
import { SpeciesCard } from "./species-card";

interface GalleryContentProps {
  slug: string;
  /** Institution-scoped species (with overrides and in-flight counts). */
  species: GallerySpecies[];
  /** Full global catalog — shown when the "Show all species" toggle is on. */
  globalSpecies: GallerySpecies[];
}

const SORT_FIELDS: SortField[] = ["common_name", "scientific_name", "family", "in_flight"];
const SORT_DIRS: SortDirection[] = ["asc", "desc"];
const PAGE_SIZE = 12;

const GALLERY_SORT_OPTIONS: SortOption[] = [
  {
    value: "in_flight-desc",
    label: "In Flight (High\u2013Low)",
    field: "in_flight",
    direction: "desc",
  },
  {
    value: "in_flight-asc",
    label: "In Flight (Low\u2013High)",
    field: "in_flight",
    direction: "asc",
  },
  { value: "common_name-asc", label: "Name (A\u2013Z)", field: "common_name", direction: "asc" },
  {
    value: "common_name-desc",
    label: "Name (Z\u2013A)",
    field: "common_name",
    direction: "desc",
  },
  {
    value: "scientific_name-asc",
    label: "Scientific (A\u2013Z)",
    field: "scientific_name",
    direction: "asc",
  },
  {
    value: "scientific_name-desc",
    label: "Scientific (Z\u2013A)",
    field: "scientific_name",
    direction: "desc",
  },
  { value: "family-asc", label: "Family (A\u2013Z)", field: "family", direction: "asc" },
  { value: "family-desc", label: "Family (Z\u2013A)", field: "family", direction: "desc" },
];

const getNumericField = (item: GallerySpecies, field: SortField): number | undefined => {
  if (field === "in_flight") return item.in_flight_count;
  return undefined;
};

/** Read initial state from URL search params (populated on back-navigation). */
function parseInitialState(searchParams: URLSearchParams) {
  const q = searchParams.get("q") ?? "";
  const sf = searchParams.get("sf") as SortField | null;
  const sd = searchParams.get("sd") as SortDirection | null;
  const fam = searchParams.get("fam");
  const vc = searchParams.get("vc");
  const gl = searchParams.get("gl");

  return {
    query: q,
    sortField: sf && SORT_FIELDS.includes(sf) ? sf : ("in_flight" as SortField),
    sortDirection: sd && SORT_DIRS.includes(sd) ? sd : ("desc" as SortDirection),
    families: fam ? fam.split(",") : [],
    visibleCount: vc ? Math.max(PAGE_SIZE, parseInt(vc, 10) || PAGE_SIZE) : undefined,
    showGlobal: gl === "1",
  };
}

export function GalleryContent({ slug, species, globalSpecies }: GalleryContentProps) {
  const searchParams = useSearchParams();

  // Parse URL params once on mount (useMemo with empty searchParams from initial render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => parseInitialState(searchParams), []);

  const [showGlobal, setShowGlobal] = useState(initial.showGlobal);

  // Switch between institution and global species list based on toggle.
  const activeSpecies = showGlobal ? globalSpecies : species;

  const search = useSpeciesSearch({
    items: activeSpecies,
    pageSize: PAGE_SIZE,
    defaultSortField: initial.sortField,
    defaultSortDirection: initial.sortDirection,
    initialQuery: initial.query,
    initialFamilies: initial.families,
    initialVisibleCount: initial.visibleCount,
    getNumericField,
  });

  const { setActiveFamilies } = search;
  const handleFiltersChange = useCallback(
    (f: SpeciesFilters) => setActiveFamilies(f.families),
    [setActiveFamilies],
  );

  const handleShowGlobalChange = useCallback(
    (show: boolean) => {
      if (show === showGlobal) return;
      setShowGlobal(show);
      // Reset search state when switching scopes so stale filters don't carry over.
      search.resetAll();
    },
    [search, showGlobal],
  );

  const handleReset = useCallback(() => {
    setShowGlobal(false);
    search.resetAll();
  }, [search]);

  // Sync state to URL (replaceState — no navigation, no re-render)
  const syncToUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search.query) params.set("q", search.query);
    if (search.sortField !== "in_flight") params.set("sf", search.sortField);
    if (search.sortDirection !== "desc") params.set("sd", search.sortDirection);
    if (search.activeFamilies.length > 0) params.set("fam", search.activeFamilies.join(","));
    if (search.visibleCount > PAGE_SIZE) params.set("vc", String(search.visibleCount));
    if (showGlobal) params.set("gl", "1");

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [
    search.query,
    search.sortField,
    search.sortDirection,
    search.activeFamilies,
    search.visibleCount,
    showGlobal,
  ]);

  useEffect(() => {
    syncToUrl();
  }, [syncToUrl]);

  return (
    <div className="space-y-6">
      <SpeciesSearchToolbar
        query={search.query}
        sortField={search.sortField}
        sortDirection={search.sortDirection}
        filters={{ families: search.activeFamilies }}
        families={search.families}
        sortOptions={GALLERY_SORT_OPTIONS}
        defaultSortField={initial.sortField}
        defaultSortDirection={initial.sortDirection}
        onQueryChange={search.setQuery}
        onSortChange={search.setSort}
        onFiltersChange={handleFiltersChange}
        onReset={handleReset}
        showGlobal={showGlobal}
        onShowGlobalChange={handleShowGlobalChange}
      />

      {/* Results count */}
      {search.totalCount > 0 && (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          Showing {search.visibleCount} of {search.totalCount} species
        </p>
      )}

      {/* Species grid */}
      {search.totalCount > 0 ? (
        <ul role="list" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {search.visibleResults.map((s) => (
            <SpeciesCard
              key={s.id}
              slug={slug}
              scientific_name={s.scientific_name}
              common_name={s.common_name}
              family={s.family}
              range={s.range}
              img_wings_open={s.img_wings_open}
              in_flight_count={s.in_flight_count}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchX className="text-muted-foreground/40 mb-4 size-12" aria-hidden="true" />
          <p className="text-muted-foreground font-medium">No species found</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Load More */}
      {search.hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={search.loadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
