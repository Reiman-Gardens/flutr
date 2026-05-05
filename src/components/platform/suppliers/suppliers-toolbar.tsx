"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SuppliersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
}

export default function SuppliersToolbar({
  search,
  onSearchChange,
  showInactive,
  onShowInactiveChange,
}: SuppliersToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Search suppliers"
          placeholder="Search by supplier name, code, country, or website..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border-border bg-card flex items-center justify-between gap-3 rounded-md border px-3 py-2 sm:justify-start">
        <Label htmlFor="show-inactive-suppliers" className="text-sm whitespace-nowrap">
          Show inactive
        </Label>
        <Switch
          id="show-inactive-suppliers"
          checked={showInactive}
          onCheckedChange={onShowInactiveChange}
          aria-label="Show inactive suppliers"
        />
      </div>
    </div>
  );
}
