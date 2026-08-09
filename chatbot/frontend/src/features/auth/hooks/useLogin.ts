import { useMutation } from "@tanstack/react-query";
import { authApi } from "../services/auth.api";

export function useLogin() {
  return useMutation({
    mutationFn: ({ username, password, target }: { username: string; password: string; target: string }) =>
      authApi.login(username, password, target),
  });
}
