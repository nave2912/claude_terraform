import { useQuery } from "@tanstack/react-query";
import { infraRequestApi } from "../services/infraRequest.api";

export function useModules() {
  return useQuery({
    queryKey: ["modules"],
    queryFn: infraRequestApi.getModules,
  });
}
