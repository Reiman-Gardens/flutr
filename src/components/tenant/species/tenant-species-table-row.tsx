import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

import { resolveCommonName, resolveLifespan, type TenantSpeciesSummary } from "./species.utils";

interface TenantSpeciesTableRowProps {
  species: TenantSpeciesSummary;
  onEdit: (species: TenantSpeciesSummary) => void;
}

export default function TenantSpeciesTableRow({ species, onEdit }: TenantSpeciesTableRowProps) {
  const commonName = resolveCommonName(species);
  const lifespan = resolveLifespan(species);
  const hasCommonNameOverride = Boolean(species.commonNameOverride?.trim());
  const hasLifespanOverride = species.lifespanOverride !== null && species.lifespanOverride > 0;

  return (
    <TableRow>
      <TableCell className="max-w-[16rem]">
        <div className="flex flex-col">
          <span className="font-medium break-words whitespace-normal italic">
            {species.scientificName}
          </span>
          <span className="text-muted-foreground text-xs break-words whitespace-normal">
            {species.family} / {species.subFamily}
          </span>
        </div>
      </TableCell>

      <TableCell className="max-w-[16rem]">
        <div className="flex flex-col gap-1">
          <span className="break-words whitespace-normal">{commonName}</span>
          {hasCommonNameOverride ? (
            <span className="text-muted-foreground text-xs break-words whitespace-normal">
              <Badge variant="secondary">Customized</Badge>{" "}
              <span>Catalog: {species.commonName}</span>
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="whitespace-nowrap">{lifespan} days</span>
          {hasLifespanOverride ? (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              <Badge variant="secondary">Customized</Badge>{" "}
              <span>Catalog: {species.lifespanDays} days</span>
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        {species.isLinked ? (
          <Badge variant="outline">In your collection</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Not received yet
          </Badge>
        )}
      </TableCell>

      <TableCell className="w-[1%] whitespace-nowrap">
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant="outline"
            aria-label={`Edit ${species.scientificName}`}
            onClick={() => onEdit(species)}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
