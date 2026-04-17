"use client";

import { Bug } from "lucide-react";
import { startTransition, useDeferredValue, useMemo, useState } from "react";

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

const PAGE_SIZE = 12;

interface SpeciesClientProps {
  species: PlatformSpeciesSummary[];
}

export default function SpeciesClient({ species: initialSpecies }: SpeciesClientProps) {
  const [species, setSpecies] = useState(initialSpecies);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpeciesId, setEditingSpeciesId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformSpeciesSummary | null>(null);

  const filteredSpecies = useMemo(
    () => filterSpecies(species, deferredSearch),
    [deferredSearch, species],
  );

  const totalPages = Math.max(1, Math.ceil(filteredSpecies.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginatedSpecies = filteredSpecies.slice(start, start + PAGE_SIZE);
  const showingEnd = Math.min(start + PAGE_SIZE, filteredSpecies.length);

  function handleSearchChange(value: string) {
    setSearch(value);
    startTransition(() => {
      setCurrentPage(1);
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
        setCurrentPage(1);
      }
    });
  }

  function handleSpeciesDeleted(speciesId: number) {
    startTransition(() => {
      setSpecies((current) => current.filter((item) => item.id !== speciesId));
      setCurrentPage((page) => Math.max(1, page - (paginatedSpecies.length === 1 ? 1 : 0)));
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
            species={paginatedSpecies}
            onEdit={handleEditSpecies}
            onDelete={handleDeleteIntent}
          />
          <SpeciesTable
            species={paginatedSpecies}
            onEdit={handleEditSpecies}
            onDelete={handleDeleteIntent}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {start + 1}-{showingEnd} of {filteredSpecies.length} species
            </p>

            {filteredSpecies.length > PAGE_SIZE ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
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
