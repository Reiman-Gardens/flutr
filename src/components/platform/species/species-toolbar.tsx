"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SpeciesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function SpeciesToolbar({ search, onSearchChange }: SpeciesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Search butterfly species"
          placeholder="Search by common name, scientific name, family, or range..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
