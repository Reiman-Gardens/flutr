import { Wind, Bug, Layers, Clock } from "lucide-react";

interface StatsOverviewCardsProps {
  totalButterflies: number;
  totalSpecies: number;
  uniqueFamilies: number;
  averageLifespan: number;
}

function formatLifespan(days: number): string {
  if (days <= 0) return "Unknown";

  if (days <= 14) {
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  if (days <= 60) {
    const floor = Math.floor(days / 7);
    const ceil = Math.ceil(days / 7);
    if (floor === ceil) return `${floor} ${floor === 1 ? "week" : "weeks"}`;
    return `${floor}\u2013${ceil} weeks`;
  }

  const floor = Math.floor(days / 30);
  const ceil = Math.ceil(days / 30);
  if (floor === ceil) return `${floor} ${floor === 1 ? "month" : "months"}`;
  return `${floor}\u2013${ceil} months`;
}

const cards = [
  { key: "butterflies", icon: Wind, label: "Butterflies" },
  { key: "species", icon: Bug, label: "Species" },
  { key: "families", icon: Layers, label: "Families" },
  { key: "lifespan", icon: Clock, label: "Avg Lifespan" },
] as const;

export function StatsOverviewCards({
  totalButterflies,
  totalSpecies,
  uniqueFamilies,
  averageLifespan,
}: StatsOverviewCardsProps) {
  const values: Record<string, string> = {
    butterflies: totalButterflies.toLocaleString(),
    species: totalSpecies.toLocaleString(),
    families: uniqueFamilies.toLocaleString(),
    lifespan: formatLifespan(averageLifespan),
  };

  return (
    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="sr-only">
        Overview
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ key, icon: Icon, label }) => (
          <div
            key={key}
            className="bg-card relative overflow-hidden rounded-2xl border px-4 py-4 shadow-sm"
          >
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Icon className="size-4" aria-hidden="true" />
              <p className="text-xs font-semibold tracking-wide uppercase">{label}</p>
            </div>
            <p className="text-foreground mt-1 text-base font-bold tracking-tight sm:text-lg">
              {values[key]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
