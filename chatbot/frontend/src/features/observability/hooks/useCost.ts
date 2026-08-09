import { useQuery } from "@tanstack/react-query";
import { observabilityApi } from "../services/observability.api";

export type CostScope = "subscription" | "resource-group";

export function useCost(scope: CostScope, resourceGroup?: string) {
  return useQuery({
    queryKey: ["observability", "cost", scope, resourceGroup],
    queryFn: () =>
      scope === "subscription"
        ? observabilityApi.getSubscriptionCost()
        : observabilityApi.getResourceGroupCost(resourceGroup as string),
    enabled: scope === "subscription" || Boolean(resourceGroup),
  });
}
