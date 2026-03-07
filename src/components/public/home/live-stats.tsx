interface LiveStatsProps {
  totalButterflies: number;
  totalSpecies: number;
}

export function LiveStats({ totalButterflies, totalSpecies }: LiveStatsProps) {
  return (
    <div
      role="region"
      aria-label="Live statistics"
      className="bg-card relative overflow-hidden rounded-2xl px-8 py-6 shadow-lg sm:px-10"
    >
      {/* Corner decoration */}
      <div
        className="bg-primary absolute -top-6 -right-6 size-24 rotate-12 rounded-xl"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Live Statistics
          </span>
          <span className="bg-success inline-block size-2.5 rounded-full" aria-hidden="true" />
        </div>

        <div className="mt-3 flex items-start gap-12">
          {/* Butterflies in flight */}
          <div className="flex items-baseline gap-3">
            <span className="text-foreground text-5xl font-bold tracking-tight sm:text-6xl">
              {totalButterflies.toLocaleString()}
            </span>
            <div>
              <p className="text-foreground text-lg font-semibold">Butterflies</p>
              <p className="text-muted-foreground text-sm">Currently in flight</p>
            </div>
          </div>

          {/* Species in flight */}
          <div className="flex items-baseline gap-3">
            <span className="text-foreground text-5xl font-bold tracking-tight sm:text-6xl">
              {totalSpecies.toLocaleString()}
            </span>
            <div>
              <p className="text-foreground text-lg font-semibold">Species</p>
              <p className="text-muted-foreground text-sm">In flight</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
