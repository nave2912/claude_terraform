import { useQuery } from "@tanstack/react-query";
import { infraRequestApi } from "../services/infraRequest.api";

export function useSchemaInfo() {
  return useQuery({
    queryKey: ["schema-info"],
    queryFn: infraRequestApi.getSchemaInfo,
  });
}
