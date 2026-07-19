import { useQuery } from "@tanstack/react-query";
import { infraRequestApi } from "../services/infraRequest.api";

/** Same polling shape as usePrStatus, but tracks a commit's checks
 * (used post-merge, to watch the push->apply workflow run). */
export function useCommitStatus(sha: string | null) {
  return useQuery({
    queryKey: ["commit-status", sha],
    queryFn: () => infraRequestApi.getCommitStatus(sha!),
    enabled: Boolean(sha),
    refetchInterval: (query) => {
      const overall = query.state.data?.overall;
      return overall === "success" || overall === "failure" ? false : 4000;
    },
  });
}
