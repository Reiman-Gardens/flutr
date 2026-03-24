import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SpeciesRangeBadgesProps {
  range: string[];
}

export function SpeciesRangeBadges({ range }: SpeciesRangeBadgesProps) {
  if (range.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="range-heading">
      <h2 id="range-heading" className="sr-only">
        Geographic Range
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="text-muted-foreground size-4" aria-hidden="true" />
        {range.map((r) => (
          <Badge key={r} variant="secondary">
            {r}
          </Badge>
        ))}
      </div>
    </section>
  );
}
