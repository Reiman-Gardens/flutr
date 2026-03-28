import { Globe, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RegionDistributionPanelProps {
  data: { name: string; count: number }[];
}

export function RegionDistributionPanel({ data }: RegionDistributionPanelProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="geo-heading">
      <h2 id="geo-heading" className="mb-3 text-lg font-bold">
        Geographic Origins
      </h2>

      <Card>
        <CardContent className="space-y-4 pt-4">
          {/* Placeholder for future interactive globe */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
            <Globe className="text-muted-foreground/30 size-12" aria-hidden="true" />
            <p className="text-muted-foreground mt-3 text-sm font-medium">
              Interactive globe coming soon
            </p>
            <p className="text-muted-foreground/70 mt-1 text-xs">
              Explore where our butterflies originate from around the world
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="list"
            aria-label="Geographic regions"
          >
            <MapPin className="text-muted-foreground size-4" aria-hidden="true" />
            {data.map(({ name, count }) => (
              <Badge key={name} variant="secondary" role="listitem">
                {name}
                <span className="text-muted-foreground ml-1.5 font-normal">{count} species</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
