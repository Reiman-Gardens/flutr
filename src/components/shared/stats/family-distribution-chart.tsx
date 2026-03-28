"use client";

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { CHART_COLORS } from "@/components/shared/stats/chart-colors";
import { splitName } from "@/lib/utils";

interface FamilyDistributionChartProps {
  data: { name: string; value: number }[];
}

function buildConfig(data: { name: string }[]): ChartConfig {
  const config: ChartConfig = {};
  for (let i = 0; i < data.length; i++) {
    config[data[i].name] = {
      label: data[i].name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  }
  config.value = { label: "Butterflies" };
  return config;
}

function MultiLineTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const lines = splitName(payload.value, 12);
  const lineHeight = 14;
  const offsetY = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x - 4}
          y={y + offsetY + i * lineHeight}
          textAnchor="end"
          dominantBaseline="central"
          className="fill-muted-foreground"
          style={{ fontSize: 11 }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function FamilyDistributionChart({ data }: FamilyDistributionChartProps) {
  const chartConfig = buildConfig(data);
  const chartHeight = Math.max(200, data.length * 48 + 40);

  return (
    <section aria-labelledby="family-heading">
      <h2 id="family-heading" className="mb-3 text-lg font-bold">
        Family Distribution
      </h2>
      <Card className="min-w-0">
        <CardContent className="overflow-hidden pt-4">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: chartHeight }}
            role="img"
            aria-label="Bar chart showing butterfly family distribution"
          >
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tickLine={false}
                axisLine={false}
                tick={MultiLineTick as never} // Recharts tick typing is incompatible with custom components
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="right"
                  className="fill-foreground"
                  fontSize={11}
                />
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
}
