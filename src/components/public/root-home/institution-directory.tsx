"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstitutionCard, type InstitutionCardProps } from "./institution-card";

interface InstitutionDirectoryProps {
  institutions: InstitutionCardProps[];
}

export function InstitutionDirectory({ institutions }: InstitutionDirectoryProps) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  // Unique states sorted alphabetically
  const states = useMemo(() => {
    const unique = [...new Set(institutions.map((i) => i.state_province))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [institutions]);

  // Sorted alphabetically, then filtered
  const filtered = useMemo(() => {
    const sorted = [...institutions].sort((a, b) => a.name.localeCompare(b.name));

    return sorted.filter((inst) => {
      const matchesSearch =
        search === "" ||
        inst.name.toLowerCase().includes(search.toLowerCase()) ||
        inst.city.toLowerCase().includes(search.toLowerCase());

      const matchesState = stateFilter === "all" || inst.state_province === stateFilter;

      return matchesSearch && matchesState;
    });
  }, [institutions, search, stateFilter]);

  return (
    <div>
      {/* Search and filter controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search institutions"
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by state">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inst) => (
            <InstitutionCard key={inst.slug} {...inst} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          {institutions.length === 0
            ? "No butterfly houses available yet. Check back soon!"
            : "No results found. Try adjusting your search or filter."}
        </p>
      )}
    </div>
  );
}
