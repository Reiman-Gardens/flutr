import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

import type { PlatformSpeciesSummary } from "./species.utils";

interface SpeciesTableRowProps {
  species: PlatformSpeciesSummary;
  onEdit: (speciesId: number) => void;
  onDelete: (species: PlatformSpeciesSummary) => void;
}

export default function SpeciesTableRow({ species, onEdit, onDelete }: SpeciesTableRowProps) {
  return (
    <TableRow>
      <TableCell className="max-w-[16rem]">
        <div className="flex flex-col">
          <span className="font-medium break-words whitespace-normal">
            {species.scientificName}
          </span>
          <span className="text-muted-foreground text-xs break-words whitespace-normal italic">
            {species.commonName}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col">
          <span>{species.family}</span>
          <span className="text-muted-foreground text-xs">{species.subFamily}</span>
        </div>
      </TableCell>

      <TableCell>{species.lifespanDays} days</TableCell>

      <TableCell className="max-w-[16rem]">
        <div className="flex flex-wrap gap-1">
          {species.range.slice(0, 3).map((entry) => (
            <Badge key={entry} variant="outline">
              {entry}
            </Badge>
          ))}
          {species.range.length > 3 ? (
            <Badge variant="outline">+{species.range.length - 3} more</Badge>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="w-[1%] whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(species.id)}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(species)}>
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
