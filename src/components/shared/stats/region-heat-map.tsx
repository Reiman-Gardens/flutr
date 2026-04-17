"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Flame, LocateFixed } from "lucide-react";

import { cn } from "@/lib/utils";
import { getRegionKeyForCountry } from "@/lib/maps/country-region";
import worldCountriesTopoJson from "@/lib/maps/world-countries-topojson";
import {
  buildMappedRegions,
  findUnmappedRegions,
  getHeatColor,
  getRegionKeyForLabel,
  type MappedRegion,
  type RegionDatum,
} from "@/components/shared/stats/region-heat-map.utils";

interface RegionHeatMapProps {
  data: RegionDatum[];
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  variant?: "compact" | "detailed";
}

const OCEAN_COLOR = "#a9c9d8";
const COUNTRY_BASE_FILL = "#d6dde4";
const COUNTRY_BASE_STROKE = "#edf2f6";

function RegionSummary({
  mappedRegions,
  selectedRegion,
  unmappedRegions,
  onSelect,
}: {
  mappedRegions: MappedRegion[];
  selectedRegion: MappedRegion | null;
  unmappedRegions: RegionDatum[];
  onSelect: (label: string) => void;
}) {
  const maxCount = Math.max(...mappedRegions.map((region) => region.count), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <LocateFixed className="size-4" aria-hidden="true" />
          <span>Region detail</span>
        </div>

        {selectedRegion ? (
          <div className="space-y-2">
            <h3 className="text-base font-semibold">{selectedRegion.label}</h3>
            <p className="text-muted-foreground text-sm">{selectedRegion.description}</p>
            <p className="text-sm font-medium">{selectedRegion.count} species represented</p>
            {selectedRegion.sourceLabels.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Source labels: {selectedRegion.sourceLabels.join(", ")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select a highlighted region to inspect it.
          </p>
        )}
      </div>

      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
        role="list"
        aria-label="Origin heat map regions"
      >
        {mappedRegions.map((region) => {
          const isSelected = region.label === selectedRegion?.label;
          const color = getHeatColor(region.count, maxCount);

          return (
            <button
              type="button"
              key={region.label}
              onClick={() => onSelect(region.label)}
              aria-pressed={isSelected}
              className={cn(
                "ring-offset-background focus-visible:ring-ring w-full rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                isSelected && "border-foreground/30 bg-muted/40",
              )}
            >
              <span className="mb-2 flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{region.label}</span>
              </span>
              <span className="text-muted-foreground block text-xs">
                {region.count} species represented
              </span>
            </button>
          );
        })}
      </div>

      {unmappedRegions.length > 0 && (
        <div className="bg-muted/35 rounded-xl border p-4">
          <p className="text-sm font-medium">Additional labels in the dataset</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {unmappedRegions.map((region) => `${region.name} (${region.count})`).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function RegionHeatMap({
  data,
  selectedLabel,
  onSelect,
  variant = "compact",
}: RegionHeatMapProps) {
  const mappedRegions = useMemo(() => buildMappedRegions(data), [data]);
  const maxCount = Math.max(...mappedRegions.map((region) => region.count), 0);
  const selectedRegion =
    mappedRegions.find((region) => region.label === selectedLabel) ?? mappedRegions[0] ?? null;
  const containerHeight = variant === "detailed" ? "h-[34rem]" : "h-[22rem]";
  const unmappedRegions = findUnmappedRegions(data);
  const mappedRegionByKey = useMemo(
    () => new Map(mappedRegions.map((region) => [region.key, region] as const)),
    [mappedRegions],
  );
  const selectedRegionKey = selectedRegion ? getRegionKeyForLabel(selectedRegion.label) : null;
  const mapScale = variant === "detailed" ? 198 : 175;

  return (
    <div
      className={cn(
        "grid gap-4",
        variant === "compact" && "lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]",
      )}
    >
      <div className="overflow-hidden rounded-xl border">
        <div className="bg-muted/35 border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Flame className="size-4" aria-hidden="true" />
            <span>{variant === "detailed" ? "Origin explorer" : "Origin heat map"}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {variant === "detailed"
              ? "Select a region to explore the species currently represented from that part of the world."
              : "Darker green regions indicate more species currently represented in flight."}
          </p>
        </div>

        <div
          className={cn(
            containerHeight,
            "bg-[linear-gradient(180deg,rgba(22,163,74,0.07),rgba(255,255,255,0.03)_30%,rgba(2,132,199,0.05))]",
          )}
        >
          <div className="h-full w-full">
            <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{ scale: mapScale }}
              className="h-full w-full"
              style={{ backgroundColor: OCEAN_COLOR }}
              aria-label="Global butterfly origin map"
            >
              <Geographies geography={worldCountriesTopoJson}>
                {({ geographies }) =>
                  geographies.map((geography) => {
                    const countryRegionKey = getRegionKeyForCountry(
                      geography.id,
                      geography.properties?.name as string | undefined,
                    );
                    const mappedRegion = countryRegionKey
                      ? (mappedRegionByKey.get(countryRegionKey) ?? null)
                      : null;
                    const isInteractive = Boolean(mappedRegion);
                    const isSelected = Boolean(
                      selectedRegionKey &&
                      countryRegionKey &&
                      selectedRegionKey === countryRegionKey,
                    );
                    const fillColor = mappedRegion
                      ? getHeatColor(mappedRegion.count, maxCount)
                      : COUNTRY_BASE_FILL;
                    const ariaLabel = mappedRegion
                      ? `${geography.properties?.name}: ${mappedRegion.label}, ${mappedRegion.count} species represented`
                      : `${geography.properties?.name}: no mapped butterfly region data`;

                    return (
                      <Geography
                        key={geography.rsmKey}
                        geography={geography}
                        aria-label={ariaLabel}
                        role={isInteractive ? "button" : undefined}
                        tabIndex={isInteractive ? 0 : -1}
                        aria-pressed={isInteractive ? isSelected : undefined}
                        onClick={() => {
                          if (!isInteractive || !mappedRegion) return;
                          onSelect(mappedRegion.label);
                        }}
                        onKeyDown={(event) => {
                          if (!isInteractive || !mappedRegion) return;

                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelect(mappedRegion.label);
                          }
                        }}
                        style={{
                          default: {
                            fill: mappedRegion ? fillColor : COUNTRY_BASE_FILL,
                            fillOpacity: mappedRegion ? (isSelected ? 0.98 : 0.9) : 1,
                            stroke: mappedRegion && isSelected ? "#1f4e3c" : COUNTRY_BASE_STROKE,
                            strokeWidth: mappedRegion && isSelected ? 1.25 : 0.65,
                            cursor: isInteractive ? "pointer" : "default",
                          },
                          hover: {
                            fill: mappedRegion ? fillColor : COUNTRY_BASE_FILL,
                            fillOpacity: mappedRegion ? 1 : 1,
                            stroke: mappedRegion ? "#1f4e3c" : COUNTRY_BASE_STROKE,
                            strokeWidth: mappedRegion ? 1.25 : 0.65,
                            cursor: isInteractive ? "pointer" : "default",
                          },
                          pressed: {
                            fill: mappedRegion ? fillColor : COUNTRY_BASE_FILL,
                            fillOpacity: mappedRegion ? 1 : 1,
                            stroke: mappedRegion ? "#153a2e" : COUNTRY_BASE_STROKE,
                            strokeWidth: mappedRegion ? 1.3 : 0.65,
                            cursor: isInteractive ? "pointer" : "default",
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
        </div>
      </div>

      {variant === "compact" && (
        <RegionSummary
          mappedRegions={mappedRegions}
          selectedRegion={selectedRegion}
          unmappedRegions={unmappedRegions}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
