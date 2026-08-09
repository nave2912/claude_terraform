import { useQuery } from "@tanstack/react-query";
import { observabilityApi } from "../services/observability.api";

export function useCostSummary() {
  return useQuery({
    queryKey: ["observability", "cost-summary"],
    queryFn: observabilityApi.getCostSummary,
  });
}
