"use client";

export interface CostBarChartRow {
  id: string;
  label: string;
  value: number;
}

interface CostBarChartProps {
  rows: CostBarChartRow[];
  formatValue: (value: number) => string;
}

const MAX_FILL_PERCENT = 85;
const MIN_VISIBLE_PERCENT = 2;

/**
 * Horizontal bar chart ranking one cost metric across categories (resource
 * groups, or resources within one). This is a single-series magnitude
 * comparison, not an identity comparison — bar length carries the ranking,
 * so one sequential hue is correct here (no legend needed for one series;
 * see the dataviz skill's choosing-a-form guidance). Bars cap at 85% of the
 * track so the value label always has room to sit right at the bar's tip
 * without clipping, and every value is a direct label — always visible, no
 * hover required to read it.
 */
export function CostBarChart({ rows, formatValue }: CostBarChartProps) {
  const max = Math.max(0, ...rows.map((r) => r.value));

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => {
        const pct =
          max > 0
            ? Math.max((row.value / max) * MAX_FILL_PERCENT, row.value > 0 ? MIN_VISIBLE_PERCENT : 0)
            : 0;
        return (
          <div
            key={row.id}
            tabIndex={0}
            className="group/bar grid grid-cols-1 gap-1 rounded-md px-1 py-1 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:items-center sm:gap-3"
          >
            <span className="truncate text-sm text-muted-foreground" title={row.label}>
              {row.label}
            </span>
            {/* min-w-0 lets this shrink to its grid column's computed width
                instead of the shrink-0 children's combined intrinsic width —
                without it the row refuses to shrink below that on narrow
                viewports and the value label clips off-screen. */}
            <div className="flex h-4 min-w-0 items-center">
              <div
                className="h-4 shrink-0 rounded-r-[4px] bg-chart-sequential transition-[filter] duration-200 group-hover/bar:brightness-110"
                style={{ width: `${pct}%`, minWidth: row.value > 0 ? "3px" : 0 }}
              />
              <span className="ml-2 shrink-0 text-xs font-medium tabular-nums text-foreground sm:text-sm">
                {formatValue(row.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
