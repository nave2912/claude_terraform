import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { observabilityApi } from "../services/observability.api";
import type { CostTrendGranularity } from "../types";

/**
 * Keeps the previous range's data on screen (at reduced opacity, per the
 * dataviz skill's "refetch keeps the frame" rule) while a new date-range
 * filter reloads, instead of flashing a skeleton over the whole chart.
 */
export function useCostTrend(granularity: CostTrendGranularity, days: number) {
  return useQuery({
    queryKey: ["observability", "cost-trend", granularity, days],
    queryFn: () => observabilityApi.getCostTrend(granularity, days),
    placeholderData: keepPreviousData,
  });
}
