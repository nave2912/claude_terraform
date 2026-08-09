import { useQuery } from "@tanstack/react-query";
import { authApi } from "../services/auth.api";

export const sessionQueryKey = ["auth", "session"] as const;

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: authApi.getSession,
    staleTime: 60_000,
  });
}
