"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSpeciesSearch, type SortField, type SortDirection } from "@/hooks/use-species-search";
import {
  SpeciesSearchToolbar,
  type SpeciesFilters,
} from "@/components/shared/species-search-toolbar";
import { SpeciesCard } from "./species-card";

interface GallerySpecies {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  range: string[];
  img_wings_open: string | null;
}

interface GalleryContentProps {
  slug: string;
  species: GallerySpecies[];
}

const SORT_FIELDS: SortField[] = ["common_name", "scientific_name", "family"];
const SORT_DIRS: SortDirection[] = ["asc", "desc"];
const PAGE_SIZE = 12;

/** Read initial state from URL search params (populated on back-navigation). */
function parseInitialState(searchParams: URLSearchParams) {
  const q = searchParams.get("q") ?? "";
  const sf = searchParams.get("sf") as SortField | null;
  const sd = searchParams.get("sd") as SortDirection | null;
  const fam = searchParams.get("fam");
  const vc = searchParams.get("vc");

  return {
    query: q,
    sortField: sf && SORT_FIELDS.includes(sf) ? sf : ("common_name" as SortField),
    sortDirection: sd && SORT_DIRS.includes(sd) ? sd : ("asc" as SortDirection),
    families: fam ? fam.split(",") : [],
    visibleCount: vc ? Math.max(PAGE_SIZE, parseInt(vc, 10) || PAGE_SIZE) : undefined,
  };
}

export function GalleryContent({ slug, species }: GalleryContentProps) {
  const searchParams = useSearchParams();

  // Parse URL params once on mount (useMemo with empty searchParams from initial render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => parseInitialState(searchParams), []);

  const search = useSpeciesSearch({
    items: species,
    pageSize: PAGE_SIZE,
    defaultSortField: initial.sortField,
    defaultSortDirection: initial.sortDirection,
    initialQuery: initial.query,
    initialFamilies: initial.families,
    initialVisibleCount: initial.visibleCount,
  });

  const { setActiveFamilies } = search;
  const handleFiltersChange = useCallback(
    (f: SpeciesFilters) => setActiveFamilies(f.families),
    [setActiveFamilies],
  );

  // Sync state to URL (replaceState — no navigation, no re-render)
  const syncToUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search.query) params.set("q", search.query);
    if (search.sortField !== "common_name") params.set("sf", search.sortField);
    if (search.sortDirection !== "asc") params.set("sd", search.sortDirection);
    if (search.activeFamilies.length > 0) params.set("fam", search.activeFamilies.join(","));
    if (search.visibleCount > PAGE_SIZE) params.set("vc", String(search.visibleCount));

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [
    search.query,
    search.sortField,
    search.sortDirection,
    search.activeFamilies,
    search.visibleCount,
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
        onQueryChange={search.setQuery}
        onSortChange={search.setSort}
        onFiltersChange={handleFiltersChange}
        onReset={search.resetAll}
      />

      {/* Results count */}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        Showing {search.visibleCount} of {search.totalCount} species
      </p>

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
