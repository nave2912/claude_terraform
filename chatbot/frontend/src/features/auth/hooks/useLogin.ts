import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/auth.api";
import { sessionQueryKey } from "./useSession";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, { authenticated: true, username: data.username });
    },
  });
}
