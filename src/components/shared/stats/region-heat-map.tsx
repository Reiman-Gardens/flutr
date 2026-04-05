"use client";

import { useMemo } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import { Circle, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { Flame, LocateFixed } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  buildMappedRegions,
  findUnmappedRegions,
  getHeatColor,
  getHeatRadius,
  type MappedRegion,
  type RegionDatum,
} from "@/components/shared/stats/region-heat-map.utils";

interface RegionHeatMapProps {
  data: RegionDatum[];
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  variant?: "compact" | "detailed";
}

const WORLD_BOUNDS: LatLngBoundsExpression = [
  [-60, -180],
  [85, 180],
];

const MAP_CENTER: [number, number] = [18, 0];
const MAP_ZOOM = 1;

function RegionSummary({
  mappedRegions,
  selectedRegion,
  unmappedRegions,
}: {
  mappedRegions: MappedRegion[];
  selectedRegion: MappedRegion | null;
  unmappedRegions: RegionDatum[];
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
            <div
              key={region.label}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
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
            </div>
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
              : "Larger, warmer circles indicate regions with more species currently represented in flight."}
          </p>
        </div>

        <div
          className={cn(
            containerHeight,
            "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.06),transparent_25%)]",
          )}
        >
          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            minZoom={MAP_ZOOM}
            scrollWheelZoom={false}
            className="h-full w-full"
            attributionControl={false}
            maxBounds={WORLD_BOUNDS}
            maxBoundsViscosity={1}
            worldCopyJump={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" noWrap />

            {mappedRegions.map((region) => {
              const isSelected = region.label === selectedRegion?.label;
              const color = getHeatColor(region.count, maxCount);

              return (
                <Circle
                  key={region.label}
                  center={region.center}
                  radius={getHeatRadius(region.count, maxCount)}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.52 : 0.28,
                    opacity: isSelected ? 0.95 : 0.7,
                    weight: isSelected ? 2 : 1,
                  }}
                  eventHandlers={{
                    click: () => onSelect(region.label),
                  }}
                >
                  <Tooltip direction="top" sticky>
                    <div className="text-sm">
                      <p className="font-semibold">{region.label}</p>
                      <p>{region.count} species represented</p>
                    </div>
                  </Tooltip>
                </Circle>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {variant === "compact" && (
        <RegionSummary
          mappedRegions={mappedRegions}
          selectedRegion={selectedRegion}
          unmappedRegions={unmappedRegions}
        />
      )}
    </div>
  );
}
