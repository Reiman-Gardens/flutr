import Image from "next/image";
import { Bug, ChevronRight, Crown, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Link } from "@/components/ui/link";
import type { SpeciesBreakdownItem } from "@/lib/queries/stats";

interface StatsHighlightCardsProps {
  slug: string;
  mostCommon: SpeciesBreakdownItem;
  mostRare: SpeciesBreakdownItem;
  daily: SpeciesBreakdownItem;
}

interface HighlightRowProps {
  slug: string;
  species: SpeciesBreakdownItem;
  label: string;
  description: string;
  icon: LucideIcon;
}

function HighlightRow({ slug, species, label, description, icon: Icon }: HighlightRowProps) {
  return (
    <li>
      <Link
        href={`/${slug}/${encodeURIComponent(species.scientific_name)}`}
        className="group bg-card hover:bg-accent focus-visible:ring-ring flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {/* Thumbnail */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
          {species.img_wings_open ? (
            <Image src={species.img_wings_open} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <div className="bg-muted flex size-full items-center justify-center">
              <Bug className="text-muted-foreground/30 size-6" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {label}
            </p>
          </div>
          <p className="truncate text-sm font-semibold">{species.name}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>

        <ChevronRight
          className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export function StatsHighlightCards({
  slug,
  mostCommon,
  mostRare,
  daily,
}: StatsHighlightCardsProps) {
  return (
    <section aria-labelledby="highlights-heading">
      <h2 id="highlights-heading" className="mb-3 text-lg font-bold">
        Notable Species
      </h2>
      <ul className="space-y-2" role="list">
        <HighlightRow
          slug={slug}
          species={mostCommon}
          label="Most Common"
          description={`${mostCommon.quantity} currently in flight`}
          icon={Crown}
        />
        <HighlightRow
          slug={slug}
          species={mostRare}
          label="Most Rare"
          description={`${mostRare.quantity} currently in flight`}
          icon={Sparkles}
        />
        <HighlightRow
          slug={slug}
          species={daily}
          label="Butterfly of the Day"
          description={`${daily.quantity} currently in flight`}
          icon={Star}
        />
      </ul>
    </section>
  );
}
