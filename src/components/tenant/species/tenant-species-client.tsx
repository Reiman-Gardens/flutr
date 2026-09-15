"use client";

import { Bug } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import TenantSpeciesCards from "./tenant-species-cards";
import TenantSpeciesEditDialog from "./tenant-species-edit-dialog";
import TenantSpeciesHeader from "./tenant-species-header";
import TenantSpeciesTable from "./tenant-species-table";
import TenantSpeciesToolbar from "./tenant-species-toolbar";
import {
  filterSpecies,
  hasOverride,
  type SpeciesOverrideValues,
  type SpeciesScope,
  type TenantSpeciesSummary,
} from "./species.utils";

const BATCH_SIZE = 12;

interface TenantSpeciesClientProps {
  species: TenantSpeciesSummary[];
}

export default function TenantSpeciesClient({ species: initialSpecies }: TenantSpeciesClientProps) {
  const [species, setSpecies] = useState(initialSpecies);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [scope, setScope] = useState<SpeciesScope>("mine");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [editTarget, setEditTarget] = useState<TenantSpeciesSummary | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredSpecies = useMemo(
    () => filterSpecies(species, deferredSearch, scope),
    [deferredSearch, scope, species],
  );

  const carriedCount = useMemo(() => species.filter((item) => item.isLinked).length, [species]);
  const overriddenCount = useMemo(() => species.filter(hasOverride).length, [species]);

  const visibleSpecies = filteredSpecies.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSpecies.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((n) => Math.min(n + BATCH_SIZE, filteredSpecies.length));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredSpecies.length]);

  function handleSearchChange(value: string) {
    setSearch(value);
    startTransition(() => {
      setVisibleCount(BATCH_SIZE);
    });
  }

  function handleScopeChange(next: SpeciesScope) {
    setScope(next);
    startTransition(() => {
      setVisibleCount(BATCH_SIZE);
    });
  }

  function handleSaved(speciesId: number, values: SpeciesOverrideValues) {
    startTransition(() => {
      setSpecies((current) =>
        current.map((item) =>
          item.id === speciesId
            ? {
                ...item,
                commonNameOverride: values.commonNameOverride,
                lifespanOverride: values.lifespanOverride,
                // Saving an override creates the link row, so the species is now carried.
                isLinked: true,
              }
            : item,
        ),
      );
    });
    setEditTarget(null);
  }

  const showingEmptyCollection = scope === "mine" && carriedCount === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <TenantSpeciesHeader carriedCount={carriedCount} overriddenCount={overriddenCount} />

      <TenantSpeciesToolbar
        search={search}
        onSearchChange={handleSearchChange}
        scope={scope}
        onScopeChange={handleScopeChange}
      />

      {species.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bug aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No butterfly species yet</EmptyTitle>
              <EmptyDescription>
                The shared species catalog is empty. Species are added by the platform team.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : showingEmptyCollection ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bug aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No species in your collection yet</EmptyTitle>
              <EmptyDescription>
                Species appear here once they arrive in a shipment. You can also browse the full
                shared catalog and customize a species before it arrives.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => handleScopeChange("all")}>Show all species</Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : filteredSpecies.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bug aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No matching species</EmptyTitle>
              <EmptyDescription>
                Try a different search term
                {scope === "mine"
                  ? ", or switch to all species to search the shared catalog."
                  : "."}
              </EmptyDescription>
            </EmptyHeader>
            {scope === "mine" ? (
              <EmptyContent>
                <Button variant="outline" onClick={() => handleScopeChange("all")}>
                  Show all species
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        </Card>
      ) : (
        <>
          <TenantSpeciesCards species={visibleSpecies} onEdit={setEditTarget} />
          <TenantSpeciesTable species={visibleSpecies} onEdit={setEditTarget} />

          <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
            Showing {visibleSpecies.length} of {filteredSpecies.length} species
          </p>

          {hasMore && <div ref={sentinelRef} className="h-8" aria-hidden="true" />}
        </>
      )}

      <TenantSpeciesEditDialog
        key={editTarget?.id ?? "none"}
        species={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
