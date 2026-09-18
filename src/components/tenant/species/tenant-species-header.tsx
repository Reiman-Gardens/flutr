interface TenantSpeciesHeaderProps {
  carriedCount: number;
  overriddenCount: number;
}

export default function TenantSpeciesHeader({
  carriedCount,
  overriddenCount,
}: TenantSpeciesHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Butterflies</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rename a species or adjust its lifespan for your institution. Your changes appear on your
          public gallery and species pages, and replace the shared catalog values everywhere in your
          organization.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          {carriedCount} {carriedCount === 1 ? "species" : "species"} in your collection
          {overriddenCount > 0 ? ` · ${overriddenCount} customized` : null}
        </p>
      </div>
    </div>
  );
}
