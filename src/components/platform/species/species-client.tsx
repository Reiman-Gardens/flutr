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

import SpeciesCards from "./species-cards";
import SpeciesDeleteDialog from "./species-delete-dialog";
import SpeciesFormDialog from "./species-form-dialog";
import SpeciesHeader from "./species-header";
import SpeciesTable from "./species-table";
import SpeciesToolbar from "./species-toolbar";
import {
  filterSpecies,
  toPlatformSpeciesSummary,
  type PlatformSpeciesRecord,
  type PlatformSpeciesSummary,
} from "./species.utils";

const BATCH_SIZE = 12;

interface SpeciesClientProps {
  species: PlatformSpeciesSummary[];
}

export default function SpeciesClient({ species: initialSpecies }: SpeciesClientProps) {
  const [species, setSpecies] = useState(initialSpecies);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpeciesId, setEditingSpeciesId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformSpeciesSummary | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredSpecies = useMemo(
    () => filterSpecies(species, deferredSearch),
    [deferredSearch, species],
  );

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

  function handleAddSpecies() {
    setEditingSpeciesId(null);
    setFormOpen(true);
  }

  function handleEditSpecies(speciesId: number) {
    setEditingSpeciesId(speciesId);
    setFormOpen(true);
  }

  function handleDeleteIntent(target: PlatformSpeciesSummary) {
    setDeleteTarget(target);
  }

  function handleSpeciesSaved(record: PlatformSpeciesRecord, mode: "create" | "edit") {
    const summary = toPlatformSpeciesSummary(record);

    startTransition(() => {
      setSpecies((current) => {
        if (mode === "create") {
          return [...current, summary];
        }

        return current.map((item) => (item.id === summary.id ? summary : item));
      });

      if (mode === "create") {
        setVisibleCount(BATCH_SIZE);
      }
    });
  }

  function handleSpeciesDeleted(speciesId: number) {
    startTransition(() => {
      setSpecies((current) => current.filter((item) => item.id !== speciesId));
    });
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <SpeciesHeader totalSpecies={species.length} onAddSpecies={handleAddSpecies} />

      <SpeciesToolbar search={search} onSearchChange={handleSearchChange} />

      {species.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bug aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No butterfly species yet</EmptyTitle>
              <EmptyDescription>
                Add the first master species record to start building the shared catalog.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={handleAddSpecies}>Add Species</Button>
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
                Try a different search term to find a species in the global catalog.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
          <SpeciesCards
            species={visibleSpecies}
            onEdit={handleEditSpecies}
            onDelete={handleDeleteIntent}
          />
          <SpeciesTable
            species={visibleSpecies}
            onEdit={handleEditSpecies}
            onDelete={handleDeleteIntent}
          />

          <p className="text-muted-foreground text-sm">
            Showing {visibleSpecies.length} of {filteredSpecies.length} species
          </p>

          {hasMore && <div ref={sentinelRef} className="h-8" aria-hidden="true" />}
        </>
      )}

      <SpeciesFormDialog
        key={editingSpeciesId ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        speciesId={editingSpeciesId}
        onSaved={handleSpeciesSaved}
      />

      <SpeciesDeleteDialog
        species={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        onDeleted={handleSpeciesDeleted}
      />
    </div>
  );
}
