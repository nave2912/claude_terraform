import { useQuery } from "@tanstack/react-query";
import { observabilityApi } from "../services/observability.api";

export function useResourceGroups() {
  return useQuery({
    queryKey: ["observability", "resource-groups"],
    queryFn: observabilityApi.getResourceGroups,
  });
}
