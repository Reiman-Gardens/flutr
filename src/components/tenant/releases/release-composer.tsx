"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Bug } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SpeciesSearchToolbar,
  type SpeciesFilters,
} from "@/components/shared/species-search-toolbar";
import { useSpeciesSearch, type SpeciesItem } from "@/hooks/use-species-search";

import { ReleaseQuantityControls } from "./release-quantity-controls";
import { computeItemRemaining, type ShipmentItemRow } from "@/components/tenant/shipments/types";

export type ReleaseQuantities = Record<number, number>;

interface ReleaseComposerProps {
  /** Shipment items as returned by GET /api/tenant/shipments/[id]. */
  items: ShipmentItemRow[];
  /** Current release quantity per shipment_item_id. */
  values: ReleaseQuantities;
  /** Replace the value for a single item id. */
  onChange: (itemId: number, quantity: number) => void;
  /**
   * In edit mode, an item's `inFlightQuantity` already includes the row being
   * edited, so the composer must add the current value back to it to compute
   * a true cap. Pass the current release's quantities here when editing.
   */
  alreadyAllocated?: ReleaseQuantities;
}

type ComposerSpeciesItem = SpeciesItem & ShipmentItemRow & { capForThisRelease: number };

/**
 * Per-species composer UI used by both Create Release and Edit Release.
 *
 * Each row shows common+scientific name, image, the per-species cap, and the
 * input controls (− / +, All, Clear, numeric input). Wrapped in the shared
 * search toolbar so a user can find a species fast on long shipments. The
 * design favors taps over typing per the one-handed release requirement.
 */
export function ReleaseComposer({
  items,
  values,
  onChange,
  alreadyAllocated,
}: ReleaseComposerProps) {
  const adapted = useMemo<ComposerSpeciesItem[]>(
    () =>
      items.map((item) => {
        // The DB-returned `inFlightQuantity` already accounts for any current
        // edit row(s). Add back the current row's allocation so the user can
        // freely move that value around without bumping into its own cap.
        const ownAllocation = alreadyAllocated?.[item.id] ?? 0;
        const capForThisRelease = computeItemRemaining(item) + ownAllocation;
        return {
          ...item,
          scientific_name: item.scientificName,
          common_name: item.commonName,
          family: "",
          capForThisRelease,
        };
      }),
    [items, alreadyAllocated],
  );

  // Only species that still have releasable butterflies are surfaced.
  const releasable = useMemo(() => adapted.filter((item) => item.capForThisRelease > 0), [adapted]);

  // Paginated to keep large shipments (hundreds of species) performant. A
  // "Load more" button below the list reveals the next batch.
  const search = useSpeciesSearch<ComposerSpeciesItem>({
    items: releasable,
    pageSize: 24,
  });

  return (
    <div className="space-y-4">
      <SpeciesSearchToolbar
        query={search.query}
        sortField={search.sortField}
        sortDirection={search.sortDirection}
        filters={{ families: search.activeFamilies }}
        families={search.families}
        onQueryChange={search.setQuery}
        onSortChange={search.setSort}
        onFiltersChange={(filters: SpeciesFilters) => search.setActiveFamilies(filters.families)}
        onReset={search.resetAll}
      />

      {search.visibleResults.length === 0 ? (
        <div className="text-muted-foreground rounded-md border p-6 text-center text-sm">
          No butterflies are available to release in this shipment.
        </div>
      ) : (
        <ul className="grid gap-3">
          {search.visibleResults.map((item) => {
            const value = values[item.id] ?? 0;
            const cap = item.capForThisRelease;
            return (
              <li
                key={item.id}
                className="bg-card flex flex-wrap items-center gap-4 rounded-lg border p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded">
                    {item.imageOpen ? (
                      <Image
                        src={item.imageOpen}
                        alt=""
                        width={160}
                        height={160}
                        quality={90}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Bug className="text-muted-foreground absolute inset-0 m-auto size-7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium">{item.commonName}</div>
                    <div className="text-muted-foreground truncate text-sm italic">
                      {item.scientificName}
                    </div>
                    <div className="text-muted-foreground text-xs">Cap: {cap}</div>
                  </div>
                </div>

                <ReleaseQuantityControls
                  value={value}
                  cap={cap}
                  ariaLabel={`Release quantity for ${item.commonName}`}
                  onChange={(next) => onChange(item.id, next)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {search.hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={search.loadMore}
            aria-label="Load more butterfly species"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
