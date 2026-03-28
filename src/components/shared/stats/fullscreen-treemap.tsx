"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Treemap } from "recharts";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/shared/back-button";
import { splitName } from "@/lib/utils";
import { getChartColor } from "@/components/shared/stats/chart-colors";
import { SpeciesPreviewCard } from "@/components/shared/stats/species-preview-card";
import type { SpeciesBreakdownItem } from "@/lib/queries/stats";

interface FullscreenTreemapProps {
  data: SpeciesBreakdownItem[];
  slug: string;
}

interface ClickableCellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  quantity: number;
  scale: number;
  onCellClick?: (index: number) => void;
}

const DRAG_THRESHOLD = 5;
const INITIAL_SCALE = 0.5;

function ClickableCell({
  x,
  y,
  width,
  height,
  index,
  name,
  quantity,
  scale,
  onCellClick,
}: ClickableCellProps) {
  const fill = getChartColor(index);
  // Scale-aware: effective visual size = layout size * zoom scale
  const effectiveWidth = width * scale;
  const effectiveHeight = height * scale;
  const showLabel = effectiveWidth > 50 && effectiveHeight > 28;
  const showQuantity = effectiveWidth > 45 && effectiveHeight > 45;
  // Font shrinks inversely with zoom so more labels fit when zoomed in
  const baseFontSize = Math.max(10, Math.min(16, width / 8));
  const fontSize = baseFontSize / scale;
  const quantityFontSize = Math.max(8, 12 / scale);
  const maxChars = Math.max(3, Math.floor(effectiveWidth / 7));
  const canMultiline = effectiveHeight > 55;
  const lines = showLabel
    ? canMultiline
      ? splitName(name, maxChars)
      : [name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name]
    : [];
  const lineHeight = fontSize + 2 / scale;
  const totalTextHeight = lines.length * lineHeight + (showQuantity ? lineHeight : 0);
  const textStartY = y + height / 2 - totalTextHeight / 2 + fontSize / 2;
  const clipId = `fs-clip-${index}`;
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <g
      className="cursor-pointer"
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!pointerStart.current) return;
        const dx = Math.abs(e.clientX - pointerStart.current.x);
        const dy = Math.abs(e.clientY - pointerStart.current.y);
        pointerStart.current = null;
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
          onCellClick?.(index);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${name}: ${quantity} in flight`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCellClick?.(index);
        }
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={x + 4}
            y={y + 4}
            width={Math.max(0, width - 8)}
            height={Math.max(0, height - 8)}
          />
        </clipPath>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={fill}
        stroke="var(--card)"
        strokeWidth={Math.max(1, 3 / scale)}
      />
      <g clipPath={`url(#${clipId})`} className="pointer-events-none">
        {lines.map((line, i) => (
          <text
            key={i}
            x={x + width / 2}
            y={textStartY + i * lineHeight}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white font-medium drop-shadow-sm"
            style={{ fontSize }}
          >
            {line}
          </text>
        ))}
        {showQuantity && (
          <text
            x={x + width / 2}
            y={textStartY + lines.length * lineHeight}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white/80 drop-shadow-sm"
            style={{ fontSize: quantityFontSize }}
          >
            {quantity.toLocaleString()}
          </text>
        )}
      </g>
    </g>
  );
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute right-3 bottom-3 flex flex-col gap-1.5 sm:right-4 md:bottom-4">
      <Button
        variant="outline"
        size="icon"
        className="bg-background/90 size-9 backdrop-blur-sm"
        onClick={() => zoomIn()}
        aria-label="Zoom in"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="bg-background/90 size-9 backdrop-blur-sm"
        onClick={() => zoomOut()}
        aria-label="Zoom out"
      >
        <ZoomOut className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="bg-background/90 size-9 backdrop-blur-sm"
        onClick={() => resetTransform()}
        aria-label="Reset zoom"
      >
        <RotateCcw className="size-4" />
      </Button>
    </div>
  );
}

export function FullscreenTreemap({ data, slug }: FullscreenTreemapProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(INITIAL_SCALE);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.back();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const selectedSpecies = selectedIndex !== null ? data[selectedIndex] : null;

  const handleCellClick = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const { width: treemapWidth, height: treemapHeight } = useMemo(() => {
    const w = Math.max(800, Math.min(2400, data.length * 60));
    const h = Math.round(w * 0.625);
    return { width: w, height: h };
  }, [data.length]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive species treemap"
      className="bg-background fixed inset-0 top-0 z-40 flex flex-col pb-16 md:top-14 md:pb-0"
    >
      {/* Treemap with zoom/pan */}
      <div className="relative flex-1 overflow-hidden">
        <TransformWrapper
          initialScale={INITIAL_SCALE}
          minScale={0.2}
          maxScale={3}
          doubleClick={{ disabled: true }}
          centerOnInit
          onTransformed={(_ref, state) => {
            setScale(state.scale);
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: treemapWidth, height: treemapHeight }}
          >
            <Treemap
              width={treemapWidth}
              height={treemapHeight}
              data={data}
              dataKey="quantity"
              nameKey="name"
              content={
                <ClickableCell
                  x={0}
                  y={0}
                  width={0}
                  height={0}
                  index={0}
                  name=""
                  quantity={0}
                  scale={scale}
                  onCellClick={handleCellClick}
                />
              }
              isAnimationActive={false}
            />
          </TransformComponent>
          <ZoomControls />
        </TransformWrapper>

        {/* Floating back button — top left */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
          <BackButton fallbackHref={`/${slug}/stats`} />
        </div>

        {/* Species preview card */}
        {selectedSpecies && (
          <SpeciesPreviewCard species={selectedSpecies} slug={slug} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}
