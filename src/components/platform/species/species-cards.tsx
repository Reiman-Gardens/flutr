import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { PlatformSpeciesSummary } from "./species.utils";

interface SpeciesCardsProps {
  species: PlatformSpeciesSummary[];
  onEdit: (speciesId: number) => void;
  onDelete: (species: PlatformSpeciesSummary) => void;
}

export default function SpeciesCards({ species, onEdit, onDelete }: SpeciesCardsProps) {
  if (species.length === 0) {
    return (
      <Card className="md:hidden">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No butterfly species found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {species.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="space-y-1">
              <p className="text-base font-medium break-words">{item.commonName}</p>
              <p className="text-muted-foreground text-sm break-words italic">
                {item.scientificName}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Family
                </p>
                <p className="text-sm">
                  {item.family}
                  <span className="text-muted-foreground"> / {item.subFamily}</span>
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Lifespan
                </p>
                <p className="text-sm">{item.lifespanDays} days</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Range
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.range.map((entry) => (
                  <Badge key={entry} variant="outline">
                    {entry}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => onEdit(item.id)}>
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => onDelete(item)}>
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
