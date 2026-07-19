import { useQuery } from "@tanstack/react-query";
import { infraRequestApi } from "../services/infraRequest.api";

export function useModelEntries(resourceType: string | null, environment: string | null) {
  return useQuery({
    queryKey: ["model-entries", resourceType, environment],
    queryFn: () => infraRequestApi.getModelEntries(resourceType!, environment!),
    enabled: Boolean(resourceType && environment),
  });
}
