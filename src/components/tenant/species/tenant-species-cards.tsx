import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { resolveCommonName, resolveLifespan, type TenantSpeciesSummary } from "./species.utils";

interface TenantSpeciesCardsProps {
  species: TenantSpeciesSummary[];
  onEdit: (species: TenantSpeciesSummary) => void;
}

export default function TenantSpeciesCards({ species, onEdit }: TenantSpeciesCardsProps) {
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
      {species.map((item) => {
        const commonName = resolveCommonName(item);
        const lifespan = resolveLifespan(item);
        const hasCommonNameOverride = Boolean(item.commonNameOverride?.trim());
        const hasLifespanOverride = item.lifespanOverride !== null && item.lifespanOverride > 0;

        return (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="space-y-1">
                <p className="text-base font-medium break-words">{commonName}</p>
                <p className="text-muted-foreground text-sm break-words italic">
                  {item.scientificName}
                </p>
                {item.isLinked ? null : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not received yet
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Common name
                  </p>
                  <p className="text-sm break-words">{commonName}</p>
                  {hasCommonNameOverride ? (
                    <p className="text-muted-foreground text-xs break-words">
                      <Badge variant="secondary">Customized</Badge> Catalog: {item.commonName}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Lifespan
                  </p>
                  <p className="text-sm">{lifespan} days</p>
                  {hasLifespanOverride ? (
                    <p className="text-muted-foreground text-xs">
                      <Badge variant="secondary">Customized</Badge> Catalog: {item.lifespanDays}{" "}
                      days
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Family
                </p>
                <p className="text-sm">
                  {item.family}
                  <span className="text-muted-foreground"> / {item.subFamily}</span>
                </p>
              </div>

              <Button
                variant="outline"
                aria-label={`Edit ${item.scientificName}`}
                onClick={() => onEdit(item)}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
