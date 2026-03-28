export function StatsHeader() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Live Statistics</h1>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        A real-time snapshot of butterflies currently in flight.
      </p>
    </div>
  );
}
