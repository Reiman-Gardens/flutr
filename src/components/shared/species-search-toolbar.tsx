"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { SortField, SortDirection } from "@/hooks/use-species-search";

export interface SpeciesFilters {
  families: string[];
}

interface SpeciesSearchToolbarProps {
  query: string;
  sortField: SortField;
  sortDirection: SortDirection;
  filters: SpeciesFilters;
  families: string[];
  onQueryChange: (q: string) => void;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onFiltersChange: (filters: SpeciesFilters) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { value: string; label: string; field: SortField; direction: SortDirection }[] =
  [
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

const DEBOUNCE_MS = 300;

export function SpeciesSearchToolbar({
  query,
  sortField,
  sortDirection,
  filters,
  families,
  onQueryChange,
  onSortChange,
  onFiltersChange,
  onReset,
}: SpeciesSearchToolbarProps) {
  // Debounced search input
  const [localQuery, setLocalQuery] = useState(query);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalQuery(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onQueryChange(value), DEBOUNCE_MS);
    },
    [onQueryChange],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const sortValue = `${sortField}-${sortDirection}`;

  const handleSortChange = useCallback(
    (value: string) => {
      const option = SORT_OPTIONS.find((o) => o.value === value);
      if (option) onSortChange(option.field, option.direction);
    },
    [onSortChange],
  );

  // Draft filter state inside the modal (applied on "Apply")
  const [draftFilters, setDraftFilters] = useState<SpeciesFilters>(filters);
  const [modalOpen, setModalOpen] = useState(false);

  // Sync draft when modal opens
  useEffect(() => {
    if (modalOpen) setDraftFilters(filters);
  }, [modalOpen, filters]);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(draftFilters);
    setModalOpen(false);
  }, [draftFilters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    const cleared: SpeciesFilters = { families: [] };
    setDraftFilters(cleared);
    onFiltersChange(cleared);
    setModalOpen(false);
  }, [onFiltersChange]);

  const activeFilterCount = filters.families.length;
  const isNonDefault =
    query.length > 0 ||
    sortField !== "common_name" ||
    sortDirection !== "asc" ||
    activeFilterCount > 0;

  return (
    <div className="space-y-3">
      {/* Search + Sort + Filter row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="species-search" className="sr-only">
            Search species
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="species-search"
            type="search"
            placeholder="Search by common name, scientific name, or family"
            value={localQuery}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <Select value={sortValue} onValueChange={handleSortChange}>
          <SelectTrigger aria-label="Sort species">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative shrink-0"
              aria-label="Filters"
            >
              <SlidersHorizontal className="size-4" />
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
              <DialogDescription>Narrow down the species list.</DialogDescription>
            </DialogHeader>

            {/* Family filter */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Family</legend>
              <div className="flex flex-wrap gap-2">
                {families.map((family) => {
                  const isSelected = draftFilters.families.includes(family);
                  return (
                    <button
                      key={family}
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          families: isSelected
                            ? prev.families.filter((f) => f !== family)
                            : [...prev.families, family],
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                        isSelected
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "bg-background text-foreground hover:bg-accent",
                      )}
                    >
                      {family}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <DialogFooter>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear All
              </Button>
              <DialogClose asChild>
                <Button onClick={handleApplyFilters}>Apply Filters</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active filter badges + Reset */}
      {isNonDefault && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.families.map((family) => (
            <span
              key={family}
              className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
            >
              {family}
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    families: filters.families.filter((f) => f !== family),
                  })
                }
                className="hover:text-foreground focus-visible:ring-ring ml-0.5 rounded-full focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`Remove ${family} filter`}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reset All
          </button>
        </div>
      )}
    </div>
  );
}
