interface LiveStatsProps {
  totalButterflies: number;
  totalSpecies: number;
  primaryColor?: string;
}

export function LiveStats({
  totalButterflies,
  totalSpecies,
  primaryColor = "#a78bfa",
}: LiveStatsProps) {
  return (
    <aside
      aria-labelledby="live-stats-heading"
      className="bg-card relative overflow-hidden rounded-2xl px-6 py-4 shadow-lg sm:px-8 sm:py-6 lg:px-10"
    >
      {/* Corner decoration */}
      <div
        className="absolute -top-6 -right-6 size-24 rotate-12 rounded-xl"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <h2
            id="live-stats-heading"
            className="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
          >
            Live Statistics
          </h2>
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
        </div>

        <div className="mt-2 flex items-start gap-6 sm:gap-12">
          {/* Butterflies in flight */}
          <div className="flex items-baseline gap-2 sm:gap-3">
            <span className="text-foreground text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {totalButterflies.toLocaleString()}
            </span>
            <div>
              <p className="text-foreground text-sm font-semibold sm:text-lg">Butterflies</p>
              <p className="text-muted-foreground text-xs sm:text-sm">Currently in flight</p>
            </div>
          </div>

          {/* Species in flight */}
          <div className="flex items-baseline gap-2 sm:gap-3">
            <span className="text-foreground text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {totalSpecies.toLocaleString()}
            </span>
            <div>
              <p className="text-foreground text-sm font-semibold sm:text-lg">Species</p>
              <p className="text-muted-foreground text-xs sm:text-sm">In flight</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
