import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SpeciesHeaderProps {
  totalSpecies: number;
  onAddSpecies: () => void;
}

export default function SpeciesHeader({ totalSpecies, onAddSpecies }: SpeciesHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Butterflies</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage the shared butterfly species catalog used across every institution.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          {totalSpecies} species in the global catalog
        </p>
      </div>

      <Button onClick={onAddSpecies}>
        <Plus aria-hidden="true" className="size-4" />
        Add Species
      </Button>
    </div>
  );
}
