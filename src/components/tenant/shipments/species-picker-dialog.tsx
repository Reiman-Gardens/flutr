"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bug, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SpeciesSearchToolbar,
  type SpeciesFilters,
} from "@/components/shared/species-search-toolbar";
import { useSpeciesSearch, type SpeciesItem } from "@/hooks/use-species-search";
import { cn } from "@/lib/utils";

import type { SpeciesPickerOption } from "./types";

type DialogSpeciesItem = SpeciesItem & SpeciesPickerOption;

interface SpeciesPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  species: SpeciesPickerOption[];
  /** IDs already added to the parent — they remain visible but un-pickable. */
  excludeIds?: number[];
  /** Called with the newly chosen species when the user confirms. */
  onConfirm: (chosen: SpeciesPickerOption[]) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * Multi-select species picker. Wraps the existing `useSpeciesSearch` +
 * `SpeciesSearchToolbar` infrastructure inside a dialog with checkbox rows
 * showing both common and scientific names plus a thumbnail image.
 */
export function SpeciesPickerDialog({
  open,
  onOpenChange,
  species,
  excludeIds,
  onConfirm,
  title = "Add butterflies",
  description = "Search the catalog and select one or more species to add.",
  confirmLabel = "Add selected",
}: SpeciesPickerDialogProps) {
  const excludeSet = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  // Adapt picker options to the SpeciesItem shape required by useSpeciesSearch.
  const items = useMemo<DialogSpeciesItem[]>(
    () =>
      species.map((s) => ({
        ...s,
        scientific_name: s.scientificName,
        common_name: s.commonName,
        family: s.family,
      })),
    [species],
  );

  const search = useSpeciesSearch<DialogSpeciesItem>({ items, pageSize: 24 });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Reset selection + search state whenever the dialog opens fresh. Doing this
  // in the open-change handler (rather than an effect) avoids set-state-in-
  // effect cascades and keeps the reset coupled to the actual user action.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setSelectedIds(new Set());
        search.resetAll();
      }
      onOpenChange(next);
    },
    [onOpenChange, search],
  );

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const chosen = species.filter((s) => selectedIds.has(s.id));
    onConfirm(chosen);
    onOpenChange(false);
  };

  // Roving focus across the option buttons. WCAG listbox pattern requires
  // Arrow Up/Down (and Home/End) to move focus between options without
  // tabbing past the list. Refs are keyed by option id (not index) so removed
  // rows clean themselves up via the callback ref, and the keyboard handler
  // re-derives the current order from `visibleResults` at event time.
  const optionRefs = useRef(new Map<number, HTMLButtonElement>());

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order = search.visibleResults
      .map((opt) => optionRefs.current.get(opt.id))
      .filter((node): node is HTMLButtonElement => node !== undefined);
    if (order.length === 0) return;
    const current = order.findIndex((node) => node === document.activeElement);
    const focusAt = (index: number) => {
      const clamped = Math.max(0, Math.min(index, order.length - 1));
      order[clamped]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(current < 0 ? 0 : current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(current < 0 ? order.length - 1 : current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(order.length - 1);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

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

        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Butterfly species"
          className="min-h-0 flex-1 overflow-y-auto rounded-md border"
          onKeyDown={handleListboxKeyDown}
        >
          {search.visibleResults.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">No species match.</p>
          ) : (
            <ul className="divide-y">
              {search.visibleResults.map((option) => {
                const isExcluded = excludeSet.has(option.id);
                const isSelected = selectedIds.has(option.id);
                return (
                  <li key={option.id}>
                    <button
                      ref={(node) => {
                        if (node) optionRefs.current.set(option.id, node);
                        else optionRefs.current.delete(option.id);
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isExcluded}
                      disabled={isExcluded}
                      onClick={() => toggle(option.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                        isExcluded
                          ? "text-muted-foreground cursor-not-allowed opacity-60"
                          : isSelected
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-accent",
                      )}
                    >
                      {/*
                        Visual checkbox stand-in. Cannot use the real Radix
                        <Checkbox> here because it renders as a <button> and
                        HTML disallows nested buttons (the row itself is the
                        button). The row's `aria-selected` already conveys
                        state to assistive tech, so this div is hidden.
                      */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          "border-input flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors",
                          (isSelected || isExcluded) &&
                            "bg-primary border-primary text-primary-foreground",
                        )}
                      >
                        {(isSelected || isExcluded) && <Check className="size-3" />}
                      </div>
                      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded">
                        {option.imgWingsOpen ? (
                          <Image
                            src={option.imgWingsOpen}
                            alt={`${option.commonName} (${option.scientificName})`}
                            width={128}
                            height={128}
                            quality={90}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Bug className="text-muted-foreground absolute inset-0 m-auto size-6" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate text-sm font-medium",
                            isSelected && "text-primary",
                          )}
                        >
                          {option.commonName}
                        </div>
                        <div className="text-muted-foreground truncate text-xs italic">
                          {option.scientificName}
                        </div>
                      </div>
                      {isExcluded && (
                        <span className="text-muted-foreground text-xs">Already added</span>
                      )}
                    </button>
                  </li>
                );
              })}

              {search.hasMore && (
                <li className="bg-muted/30 flex justify-center p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={search.loadMore}
                    aria-label="Load more butterfly species"
                    className="text-muted-foreground text-xs"
                  >
                    Load more
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {/*
            Visual hierarchy: a small status line on the left, a tertiary
            ghost Cancel that doesn't compete with the primary action, and
            the primary Add selected on the right.
          */}
          <span className="text-muted-foreground text-xs">
            {selectedIds.size === 0
              ? "Select at least one species"
              : `${selectedIds.size} selected`}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={selectedIds.size === 0} onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
