import Image from "next/image";
import Link from "next/link";
import { Globe, Clock, Leaf, Activity } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeaturedButterflyProps {
  slug: string;
  scientific_name: string;
  common_name: string;
  img_wings_open: string | null;
  range: string[];
  lifespan_days: number;
  host_plant: string | null;
  is_in_flight: boolean;
}

export function FeaturedButterfly({
  slug,
  scientific_name,
  common_name,
  img_wings_open,
  range,
  lifespan_days,
  host_plant,
  is_in_flight,
}: FeaturedButterflyProps) {
  return (
    <section aria-labelledby="featured-heading">
      <h2 id="featured-heading" className="mb-4 text-lg font-bold">
        Butterfly of the Day
      </h2>

      <Card className="gap-0 overflow-hidden py-0 lg:flex lg:flex-row">
        {/* Image — fills card height on desktop */}
        {img_wings_open ? (
          <div className="relative aspect-4/3 lg:aspect-auto lg:w-2/5 lg:shrink-0">
            <Image
              src={img_wings_open}
              alt={`${common_name} (${scientific_name})`}
              fill
              sizes="(min-width: 1024px) 40%, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-4">
              <p className="text-lg font-bold text-white">{common_name}</p>
              <p className="text-sm text-white/80 italic">{scientific_name}</p>
            </div>
          </div>
        ) : (
          <CardContent>
            <h3 className="text-lg font-bold">{common_name}</h3>
            <p className="text-muted-foreground text-sm italic">{scientific_name}</p>
          </CardContent>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col py-6">
          <CardContent className="flex-1">
            <div className="grid grid-cols-2 gap-3">
              <DetailItem
                icon={<Globe className="size-4" aria-hidden="true" />}
                label="Origin"
                value={range.length > 0 ? range[0] : "Unknown"}
              />
              <DetailItem
                icon={<Clock className="size-4" aria-hidden="true" />}
                label="Lifespan"
                value={`${lifespan_days} Days`}
              />
              <DetailItem
                icon={<Leaf className="size-4" aria-hidden="true" />}
                label="Host Plant"
                value={host_plant ?? "Unknown"}
              />
              <DetailItem
                icon={<Activity className="size-4" aria-hidden="true" />}
                label="Status"
                value={is_in_flight ? "Active Flight" : "In Collection"}
              />
            </div>
          </CardContent>

          <CardFooter className="mt-auto pt-4">
            <Button asChild className="w-full">
              <Link href={`/${slug}/${encodeURIComponent(scientific_name)}`}>
                View Full Profile
              </Link>
            </Button>
          </CardFooter>
        </div>
      </Card>
    </section>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
