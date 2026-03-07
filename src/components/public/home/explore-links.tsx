import Link from "next/link";
import { LayoutGrid, BarChart3, Info, Heart, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ExploreLinkItem {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ExploreLinksProps {
  basePath: string;
}

export function ExploreLinks({ basePath }: ExploreLinksProps) {
  const links: ExploreLinkItem[] = [
    {
      href: `${basePath}/about`,
      icon: Info,
      title: "About the Exhibit",
      description: "Our conservation mission",
    },
    {
      href: `${basePath}/stats`,
      icon: BarChart3,
      title: "Flight Statistics",
      description: "Real-time transparency data",
    },
    {
      href: `${basePath}/gallery`,
      icon: LayoutGrid,
      title: "Species Gallery",
      description: "Browse our local residents",
    },
    {
      href: `${basePath}/volunteer`,
      icon: Heart,
      title: "Volunteer",
      description: "Help support our butterfly house",
    },
  ];

  return (
    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading" className="mb-4 text-lg font-bold">
        Explore Flutr
      </h2>
      <nav aria-label="Explore pages">
        <ul className="space-y-2" role="list">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group bg-card hover:bg-accent focus-visible:ring-ring flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <div className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{link.title}</p>
                    <p className="text-muted-foreground text-sm">{link.description}</p>
                  </div>
                  <ChevronRight
                    className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
