"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bug, Expand, MapPin, Minimize2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/ui/link";
import RegionHeatMap from "@/components/shared/stats/region-heat-map";
import {
  buildMappedRegions,
  getHeatColor,
  getRegionKeyForLabel,
  getRegionLabelForRange,
  speciesBelongsToRegion,
} from "@/components/shared/stats/region-heat-map.utils";
import type { StatsPageData } from "@/lib/queries/stats";
import { cn } from "@/lib/utils";

interface RegionDistributionPanelProps {
  data: StatsPageData["regionDistribution"];
  speciesData: StatsPageData["speciesBreakdown"];
  slug: string;
}

export function RegionDistributionPanel({ data, speciesData, slug }: RegionDistributionPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDetailed, setIsDetailed] = useState(false);
  const [search, setSearch] = useState("");
  const mappedRegions = useMemo(
    () =>
      [...buildMappedRegions(data)].sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      ),
    [data],
  );
  const selectedRegionFromQuery = useMemo(() => {
    const regionKey = searchParams.get("region");
    if (!regionKey) return null;
    return mappedRegions.find((region) => region.key === regionKey) ?? null;
  }, [mappedRegions, searchParams]);

  const resolvedSelectedLabel = selectedRegionFromQuery?.label ?? mappedRegions[0]?.label ?? null;
  const selectedRegion =
    mappedRegions.find((region) => region.label === resolvedSelectedLabel) ?? null;
  const maxCount = Math.max(...mappedRegions.map((region) => region.count), 0);

  function handleRegionSelect(regionLabel: string) {
    const regionKey = getRegionKeyForLabel(regionLabel);
    if (!regionKey) return;

    const nextQuery = new URLSearchParams(searchParams.toString());
    nextQuery.set("region", regionKey);
    router.replace(`${pathname}?${nextQuery.toString()}`, { scroll: false });
  }

  const filteredSpecies = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return speciesData
      .filter((species) =>
        selectedRegion ? speciesBelongsToRegion(species, selectedRegion.label) : false,
      )
      .filter((species) => {
        if (!searchTerm) return true;

        return (
          species.name.toLowerCase().includes(searchTerm) ||
          species.scientific_name.toLowerCase().includes(searchTerm) ||
          species.family.toLowerCase().includes(searchTerm)
        );
      });
  }, [search, selectedRegion, speciesData]);

  if (data.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="geo-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="geo-heading" className="text-lg font-bold">
          Geographic Origins
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDetailed((current) => !current)}
          aria-pressed={isDetailed}
          aria-controls="geo-panel-content"
        >
          {isDetailed ? (
            <Minimize2 className="size-4" aria-hidden="true" />
          ) : (
            <Expand className="size-4" aria-hidden="true" />
          )}
          {isDetailed ? "Compact View" : "Detailed View"}
        </Button>
      </div>

      <Card>
        <CardContent id="geo-panel-content" className="space-y-4 pt-4">
          {isDetailed ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
              <RegionHeatMap
                data={data}
                selectedLabel={resolvedSelectedLabel}
                onSelect={handleRegionSelect}
                variant="detailed"
              />

              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  {selectedRegion ? (
                    <>
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: getHeatColor(selectedRegion.count, maxCount) }}
                          aria-hidden="true"
                        />
                        <span>{selectedRegion.label}</span>
                      </div>
                      <p className="text-muted-foreground text-sm">{selectedRegion.description}</p>
                      <p className="mt-3 text-sm font-medium">
                        {selectedRegion.count} species represented
                      </p>
                      {selectedRegion.sourceLabels.length > 0 && (
                        <p className="text-muted-foreground mt-2 text-xs">
                          Source labels: {selectedRegion.sourceLabels.join(", ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No mapped regions are available for the current data yet.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border p-4">
                  <p className="mb-2 text-sm font-medium">Select region</p>
                  <p className="text-muted-foreground mb-3 text-xs">
                    Click the map or use these buttons for keyboard-friendly selection.
                  </p>
                  <ul className="flex flex-wrap gap-2" role="list" aria-label="Mapped regions">
                    {mappedRegions.length > 0 ? (
                      mappedRegions.map((region) => (
                        <li key={region.key}>
                          <button
                            type="button"
                            onClick={() => handleRegionSelect(region.label)}
                            aria-pressed={region.label === resolvedSelectedLabel}
                            className={cn(
                              "ring-offset-background focus-visible:ring-ring inline-flex rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                            )}
                          >
                            <Badge
                              variant={
                                region.label === resolvedSelectedLabel ? "default" : "secondary"
                              }
                            >
                              {region.label}
                              <span className="text-muted-foreground ml-1.5 font-normal">
                                {region.count} species
                              </span>
                            </Badge>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li>
                        <Badge variant="secondary">No mapped regions available</Badge>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="rounded-xl border p-4">
                  <label
                    htmlFor="geo-species-search"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <Search className="size-4" aria-hidden="true" />
                    Search region species
                  </label>
                  <Input
                    id="geo-species-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by common name, scientific name, or family"
                  />
                </div>

                <div className="space-y-3 xl:max-h-[28rem] xl:overflow-y-auto xl:pr-1">
                  {filteredSpecies.length > 0 ? (
                    filteredSpecies.map((species) => {
                      const mappedLabel = getRegionLabelForRange(species.range);

                      return (
                        <Link
                          key={species.scientific_name}
                          href={`/${slug}/${encodeURIComponent(species.scientific_name)}`}
                          className="hover:border-foreground/30 block rounded-xl border p-3 transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border">
                              {species.img_wings_open ? (
                                <Image
                                  src={species.img_wings_open}
                                  alt={`${species.name} (${species.scientific_name})`}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center">
                                  <Bug
                                    className="text-muted-foreground/40 size-7"
                                    aria-hidden="true"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <h3 className="truncate text-base font-semibold">{species.name}</h3>
                              <p className="text-muted-foreground truncate text-sm italic">
                                {species.scientific_name}
                              </p>
                              <p className="text-sm">{species.family}</p>
                              <p className="text-muted-foreground text-xs">
                                {species.quantity.toLocaleString()} in flight
                              </p>
                              {mappedLabel && (
                                <p className="text-muted-foreground text-xs">
                                  Region: {mappedLabel}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="bg-muted/35 rounded-xl border p-4 text-sm">
                      <p className="font-medium">No species match this search.</p>
                      <p className="text-muted-foreground mt-1">
                        Try a different name, scientific name, or family.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <RegionHeatMap
                data={data}
                selectedLabel={resolvedSelectedLabel}
                onSelect={handleRegionSelect}
              />

              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="text-muted-foreground size-4" aria-hidden="true" />
                <ul className="flex flex-wrap gap-2" role="list" aria-label="Geographic regions">
                  {mappedRegions.length > 0 ? (
                    mappedRegions.map((region) => (
                      <li key={region.key}>
                        <button
                          type="button"
                          onClick={() => handleRegionSelect(region.label)}
                          aria-pressed={region.label === resolvedSelectedLabel}
                          className={cn(
                            "ring-offset-background focus-visible:ring-ring inline-flex rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                          )}
                        >
                          <Badge
                            variant={
                              region.label === resolvedSelectedLabel ? "default" : "secondary"
                            }
                          >
                            {region.label}
                            <span className="text-muted-foreground ml-1.5 font-normal">
                              {region.count} species
                            </span>
                          </Badge>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li>
                      <Badge variant="secondary">No mapped regions available</Badge>
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
