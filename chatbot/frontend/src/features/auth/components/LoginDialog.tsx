"use client";

import { useId, useState } from "react";
import { LockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "../hooks/useLogin";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The one workspace path this login unlocks, e.g. "/infra" — required
   * whenever `open` is true; a login with no target wouldn't mean anything
   * (see proxy.ts, which only accepts a token bound to this exact path). */
  target: string | null;
  /** Friendly name of the workspace at `target`, shown in the dialog. */
  targetLabel?: string;
  /** Called after a successful login — typically navigates to `target`. */
  onSuccess?: () => void;
}

export function LoginDialog({ open, onOpenChange, target, targetLabel, onSuccess }: LoginDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const usernameId = useId();
  const passwordId = useId();
  const login = useLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    login.mutate(
      { username, password, target },
      {
        onSuccess: () => {
          setPassword("");
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          login.reset();
          setPassword("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
            <LockIcon className="size-5" />
          </div>
          <DialogTitle className="mt-2">Sign in</DialogTitle>
          <DialogDescription>
            {targetLabel ? `Enter your credentials to open ${targetLabel}.` : "Enter your credentials to continue."}
          </DialogDescription>
        </DialogHeader>

        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={usernameId}>Username</Label>
            <Input
              id={usernameId}
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={passwordId}>Password</Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {login.isError && (
            <p className="text-sm text-destructive">
              {login.error instanceof Error ? login.error.message : "Sign in failed."}
            </p>
          )}

          <Button type="submit" className="mt-1 w-full" disabled={login.isPending || !target}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
