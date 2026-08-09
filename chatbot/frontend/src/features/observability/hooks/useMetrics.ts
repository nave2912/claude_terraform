import { useQuery } from "@tanstack/react-query";
import { observabilityApi } from "../services/observability.api";

export function useMetrics(resourceGroup?: string) {
  return useQuery({
    queryKey: ["observability", "metrics", resourceGroup ?? "all"],
    queryFn: () => observabilityApi.getMetrics(resourceGroup),
  });
}
