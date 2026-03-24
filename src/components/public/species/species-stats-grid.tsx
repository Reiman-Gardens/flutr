import { Clock, Wind, Bug, Layers } from "lucide-react";

interface SpeciesStatsGridProps {
  lifespanDays: number;
  inFlightCount: number;
  family: string;
  subFamily: string;
}

function formatLifespan(days: number): string {
  if (days <= 0) return "Unknown";

  if (days <= 14) {
    return `${days} days`;
  }

  if (days <= 60) {
    const floor = Math.floor(days / 7);
    const ceil = Math.ceil(days / 7);
    return floor === ceil ? `${floor} weeks` : `${floor}\u2013${ceil} weeks`;
  }

  const floor = Math.floor(days / 30);
  const ceil = Math.ceil(days / 30);
  return floor === ceil ? `${floor} months` : `${floor}\u2013${ceil} months`;
}

const stats = [
  { key: "lifespan", icon: Clock, label: "Lifespan" },
  { key: "in-flight", icon: Wind, label: "In Flight" },
  { key: "family", icon: Bug, label: "Family" },
  { key: "sub-family", icon: Layers, label: "Subfamily" },
] as const;

export function SpeciesStatsGrid({
  lifespanDays,
  inFlightCount,
  family,
  subFamily,
}: SpeciesStatsGridProps) {
  const values: Record<string, string> = {
    lifespan: formatLifespan(lifespanDays),
    "in-flight": inFlightCount > 0 ? String(inFlightCount) : "None",
    family,
    "sub-family": subFamily,
  };

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Species Statistics
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ key, icon: Icon, label }) => (
          <div
            key={key}
            className="bg-card relative overflow-hidden rounded-2xl border px-4 py-4 shadow-sm"
          >
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Icon className="size-4" aria-hidden="true" />
              <p className="text-xs font-semibold tracking-wide uppercase">{label}</p>
            </div>
            <p className="text-foreground mt-1 text-lg font-bold tracking-tight">{values[key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
