import { useQuery } from "@tanstack/react-query";
import { infraRequestApi } from "../services/infraRequest.api";

/**
 * Polls PR CI status until it settles. "none" (no checks reported yet —
 * GitHub Actions can take a few seconds to register the pull_request
 * event) and "pending" both keep polling; "success"/"failure" stop.
 */
export function usePrStatus(prNumber: number) {
  return useQuery({
    queryKey: ["pr-status", prNumber],
    queryFn: () => infraRequestApi.getPrStatus(prNumber),
    refetchInterval: (query) => {
      const overall = query.state.data?.overall;
      return overall === "success" || overall === "failure" ? false : 4000;
    },
  });
}
