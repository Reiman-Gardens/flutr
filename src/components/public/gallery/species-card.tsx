import Image from "next/image";
import { Bug, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";

interface SpeciesCardProps {
  slug: string;
  scientific_name: string;
  common_name: string;
  family: string;
  range: string[];
  img_wings_open: string | null;
  in_flight_count: number;
}

export function SpeciesCard({
  slug,
  scientific_name,
  common_name,
  family,
  range,
  img_wings_open,
  in_flight_count,
}: SpeciesCardProps) {
  const region = range.length > 0 ? range[0] : null;

  return (
    <li>
      <article>
        <Link
          href={`/${slug}/${encodeURIComponent(scientific_name)}`}
          className="group focus-visible:ring-ring block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Card className="gap-0 overflow-hidden py-0 transition-shadow group-hover:shadow-md">
            {/* Image */}
            <div className="relative aspect-4/3 overflow-hidden">
              {img_wings_open ? (
                <Image
                  src={img_wings_open}
                  alt={`${common_name} (${scientific_name})`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform motion-safe:group-hover:scale-105"
                />
              ) : (
                <div className="bg-muted flex size-full items-center justify-center">
                  <Bug className="text-muted-foreground/30 size-10" aria-hidden="true" />
                </div>
              )}

              {/* Chips */}
              <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                {region && (
                  <span className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm">
                    <span className="sr-only">Region: </span>
                    {region}
                  </span>
                )}
                <span className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm">
                  {family}
                </span>
                <span className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm">
                  <span className="sr-only">Number of butterflies in flight: </span>
                  {in_flight_count} Flying Today
                </span>
              </div>
            </div>

            {/* Info */}
            <CardContent className="py-3">
              <div className="flex items-center gap-1">
                <h3 className="truncate text-sm font-semibold">{common_name}</h3>
                <ChevronRight
                  className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted-foreground truncate text-xs italic">{scientific_name}</p>
            </CardContent>
          </Card>
        </Link>
      </article>
    </li>
  );
}
