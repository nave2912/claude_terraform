"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCostTrend } from "../hooks/useCostTrend";
import { ApiError } from "../services/observability.api";
import { CostTrendChart } from "./CostTrendChart";
import type { CostTrendGranularity } from "../types";

const DAILY_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const MONTHLY_PRESETS = [
  { label: "3 months", days: 90 },
  { label: "6 months", days: 182 },
  { label: "12 months", days: 364 },
];

function formatCost(cost: number, currency: string) {
  return `${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`.trim();
}

/**
 * Day-to-day and month-to-month cost trend — its own filters (granularity +
 * date-range presets) in one row above the chart, scoping everything below
 * them, per the dataviz skill's filter composition rules.
 */
export function CostTrendSection() {
  const [granularity, setGranularity] = useState<CostTrendGranularity>("Daily");
  const [days, setDays] = useState(30);
  const presets = granularity === "Daily" ? DAILY_PRESETS : MONTHLY_PRESETS;
  const { data, isLoading, isPlaceholderData, error } = useCostTrend(granularity, days);

  function switchGranularity(next: CostTrendGranularity) {
    setGranularity(next);
    setDays(next === "Daily" ? 30 : 182);
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">Cost trend</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              <Button
                type="button"
                size="sm"
                variant={granularity === "Daily" ? "default" : "ghost"}
                onClick={() => switchGranularity("Daily")}
              >
                Day to day
              </Button>
              <Button
                type="button"
                size="sm"
                variant={granularity === "Monthly" ? "default" : "ghost"}
                onClick={() => switchGranularity("Monthly")}
              >
                Monthly
              </Button>
            </div>
            <div className="inline-flex rounded-lg bg-muted p-1">
              {presets.map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  size="sm"
                  variant={days === preset.days ? "default" : "ghost"}
                  onClick={() => setDays(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && <Skeleton className="h-56 w-full" />}

        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError && error.status === 429
              ? "Azure is rate-limiting cost data right now — this usually clears in a few seconds. Try again shortly."
              : error instanceof Error
                ? error.message
                : "Failed to load cost trend."}
          </p>
        )}

        {data && (
          <div className={isPlaceholderData ? "opacity-50 transition-opacity" : "transition-opacity"}>
            <CostTrendChart
              points={data.points}
              granularity={data.granularity}
              formatValue={(value) => formatCost(value, data.currency)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
