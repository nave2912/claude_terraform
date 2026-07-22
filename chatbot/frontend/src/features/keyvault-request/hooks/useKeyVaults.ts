import { useQuery } from "@tanstack/react-query";
import { keyvaultRequestApi } from "../services/keyvaultRequest.api";

export function useKeyVaults() {
  return useQuery({
    queryKey: ["keyvault-list"],
    queryFn: keyvaultRequestApi.listVaults,
  });
}
