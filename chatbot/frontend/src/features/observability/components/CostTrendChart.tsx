"use client";

import { useMemo, useState } from "react";
import type { CostTrendGranularity, CostTrendPoint } from "../types";

interface CostTrendChartProps {
  points: CostTrendPoint[];
  granularity: CostTrendGranularity;
  formatValue: (value: number) => string;
}

const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 16, right: 16, bottom: 26, left: 8 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const MAX_X_LABELS = 6;

function formatAxisDate(date: string, granularity: CostTrendGranularity) {
  const d = new Date(`${date}T00:00:00Z`);
  return granularity === "Daily"
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Rounds a raw step up to the nearest 1/2/5 × 10^n — the standard "nice
 * numbers" step so axis ticks land on clean values (0 / 1,000 / 2,000),
 * never something like 283.8. */
function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

/** A rounded axis ceiling plus the clean tick values between 0 and it. */
function computeNiceTicks(maxValue: number, targetCount = 4): { ceiling: number; ticks: number[] } {
  if (maxValue <= 0) return { ceiling: 1, ticks: [0, 1] };
  const step = niceStep(maxValue / targetCount);
  const ceiling = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= ceiling + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { ceiling, ticks };
}

/**
 * Single-series line chart for the Cost tab's day-to-day / month-to-month
 * trend. One sequential hue (no legend — a lone series doesn't need one),
 * a 2px line with a soft ~10% area wash, and the end value direct-labeled;
 * every other point is reachable through the hover/focus crosshair +
 * tooltip rather than labeling every dot (see the dataviz skill's marks +
 * interaction guidance).
 */
export function CostTrendChart({ points, granularity, formatValue }: CostTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { linePath, areaPath, coords, yTicks } = useMemo(() => {
    const n = points.length;
    const rawMax = Math.max(0, ...points.map((p) => p.cost));
    const { ceiling, ticks } = computeNiceTicks(rawMax);
    const xFor = (i: number) => (n <= 1 ? MARGIN.left + PLOT_W / 2 : MARGIN.left + (i / (n - 1)) * PLOT_W);
    const yFor = (cost: number) => MARGIN.top + PLOT_H - (cost / ceiling) * PLOT_H;
    const pts = points.map((p, i) => ({ x: xFor(i), y: yFor(p.cost), ...p }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const baseline = MARGIN.top + PLOT_H;
    const area =
      pts.length > 0
        ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${baseline} L${pts[0].x.toFixed(1)},${baseline} Z`
        : "";
    return { linePath: line, areaPath: area, coords: pts, yTicks: ticks.map((v) => ({ value: v, y: yFor(v) })) };
  }, [points]);

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No cost data for this range.</p>;
  }

  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const last = coords[coords.length - 1];

  // The hit-rect spans exactly PLOT_W of the viewBox, so the pointer's
  // fraction across its rendered width maps 1:1 onto the point index.
  function indexFromClientX(clientX: number, rect: DOMRect) {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (coords.length <= 1) return 0;
    return Math.round(ratio * (coords.length - 1));
  }

  const tooltipPoint = hovered ?? null;
  const tooltipNearRightEdge = tooltipPoint ? tooltipPoint.x > WIDTH * 0.75 : false;
  const tooltipNearLeftEdge = tooltipPoint ? tooltipPoint.x < WIDTH * 0.25 : false;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={`${granularity === "Daily" ? "Daily" : "Monthly"} cost trend, ending at ${formatValue(last.cost)} on ${formatAxisDate(last.date, granularity)}`}
      >
        {/* Gridlines + y-axis ticks — hairline, recessive, rounded to clean values */}
        {yTicks.map(({ value, y }) => (
          <g key={value}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth={1}
            />
            <text x={MARGIN.left} y={y - 4} className="fill-muted-foreground text-[9px]">
              {formatCompact(value)}
            </text>
          </g>
        ))}

        {/* Area wash + line */}
        <path d={areaPath} className="fill-chart-sequential/10" stroke="none" />
        <path
          d={linePath}
          className="stroke-chart-sequential"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* X-axis date labels — sparse, never one per point */}
        {coords.map((p, i) =>
          i % labelEvery === 0 || i === coords.length - 1 ? (
            <text
              key={p.date}
              x={Math.min(Math.max(p.x, MARGIN.left + 14), WIDTH - MARGIN.right - 14)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px] tabular-nums"
            >
              {formatAxisDate(p.date, granularity)}
            </text>
          ) : null
        )}

        {/* End marker + direct value label — the one point that's always labeled */}
        <circle cx={last.x} cy={last.y} r={4} className="fill-chart-sequential stroke-card" strokeWidth={2} />
        <text
          x={Math.min(last.x, WIDTH - MARGIN.right - 4)}
          y={Math.max(last.y - 10, MARGIN.top + 8)}
          textAnchor="end"
          className="fill-foreground text-[10px] font-medium tabular-nums"
        >
          {formatValue(last.cost)}
        </text>

        {/* Hover crosshair */}
        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              className="stroke-muted-foreground/40"
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} className="fill-chart-sequential stroke-card" strokeWidth={2} />
          </>
        )}

        {/* Hit-target overlay — the mark is bigger than the line itself, per interaction.md */}
        <rect
          x={MARGIN.left}
          y={0}
          width={PLOT_W}
          height={HEIGHT}
          fill="transparent"
          tabIndex={0}
          className="outline-none focus-visible:fill-foreground/[0.02]"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverIndex(indexFromClientX(e.clientX, rect));
          }}
          onPointerLeave={() => setHoverIndex(null)}
          onFocus={() => setHoverIndex(coords.length - 1)}
          onBlur={() => setHoverIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setHoverIndex((i) => Math.max(0, (i ?? coords.length - 1) - 1));
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              setHoverIndex((i) => Math.min(coords.length - 1, (i ?? 0) + 1));
            }
          }}
        />
      </svg>

      {tooltipPoint && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md bg-popover px-2 py-1 text-xs shadow-md ring-1 ring-border"
          style={{
            left: `${(tooltipPoint.x / WIDTH) * 100}%`,
            transform: tooltipNearRightEdge ? "translateX(-100%)" : tooltipNearLeftEdge ? "translateX(0%)" : "translateX(-50%)",
          }}
        >
          <div className="font-semibold tabular-nums text-popover-foreground">{formatValue(tooltipPoint.cost)}</div>
          <div className="text-muted-foreground">{formatAxisDate(tooltipPoint.date, granularity)}</div>
        </div>
      )}
    </div>
  );
}
