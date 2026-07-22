import { useQuery } from "@tanstack/react-query";
import { keyvaultRequestApi } from "../services/keyvaultRequest.api";

export function useVaultSecrets(vaultName: string | null) {
  return useQuery({
    queryKey: ["keyvault-secrets", vaultName],
    queryFn: () => keyvaultRequestApi.listSecrets(vaultName!),
    enabled: Boolean(vaultName),
  });
}
