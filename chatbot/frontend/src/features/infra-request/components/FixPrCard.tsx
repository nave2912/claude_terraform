"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { infraRequestApi } from "../services/infraRequest.api";

interface Props {
  prNumber: number;
}

/**
 * "Fix with AI" — diagnose-then-confirm: the first click only diagnoses
 * (read-only, never touches git); the proposed fix is shown for review,
 * and a SEPARATE "Apply fix" click is what actually commits + pushes to
 * the PR's own branch. A needs_clarification result renders its question
 * with a reply box that re-runs diagnose with that answer — same
 * round-trip the /terraform clarification flow already uses, just
 * scoped to this card instead of the global chat transcript.
 */
export function FixPrCard({ prNumber }: Props) {
  const [started, setStarted] = useState(false);
  const [reply, setReply] = useState("");

  const diagnoseMutation = useMutation({
    mutationFn: (userReply?: string) => infraRequestApi.fixPrDiagnose(prNumber, userReply),
  });

  const applyMutation = useMutation({
    mutationFn: (files: { filePath: string; newContent: string }[]) => infraRequestApi.fixPrApply(prNumber, files),
  });

  if (!started) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-fit gap-1.5"
        onClick={() => {
          setStarted(true);
          diagnoseMutation.mutate(undefined);
        }}
      >
        <Sparkles className="size-3.5" /> Fix with AI
      </Button>
    );
  }

  if (applyMutation.data?.status === "fix_applied") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" /> Applied — pushed to the same PR branch, CI is re-running.
      </p>
    );
  }

  const applyFailedMessage =
    applyMutation.data?.status === "apply_failed"
      ? applyMutation.data.error
      : applyMutation.isError
        ? applyMutation.error instanceof Error
          ? applyMutation.error.message
          : String(applyMutation.error)
        : null;

  if (diagnoseMutation.isPending || applyMutation.isPending) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> {applyMutation.isPending ? "Applying fix…" : "Diagnosing…"}
      </p>
    );
  }

  if (diagnoseMutation.isError) {
    const message =
      diagnoseMutation.error instanceof Error ? diagnoseMutation.error.message : String(diagnoseMutation.error);
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertTriangle className="size-4" /> Diagnose failed: {message}
      </p>
    );
  }

  const outcome = diagnoseMutation.data;
  if (!outcome) return null;

  if (outcome.status === "nothing_failing") {
    return <p className="text-xs text-muted-foreground">{outcome.message}</p>;
  }

  if (outcome.status === "escalated") {
    return (
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Couldn&apos;t auto-fix this: {outcome.reason}
      </p>
    );
  }

  if (outcome.status === "needs_clarification") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
        <p className="text-sm">{outcome.question}</p>
        <div className="flex gap-1.5">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Your answer…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && reply.trim()) diagnoseMutation.mutate(reply.trim());
            }}
          />
          <Button size="sm" disabled={!reply.trim()} onClick={() => diagnoseMutation.mutate(reply.trim())}>
            Submit
          </Button>
        </div>
      </div>
    );
  }

  // outcome.status === "fix_proposed"
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <p className="text-sm">{outcome.explanation}</p>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {outcome.files.map((f) => (
          <li key={f.filePath} className="font-mono">
            {f.filePath}
          </li>
        ))}
      </ul>
      {applyFailedMessage && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="size-3.5" /> {applyFailedMessage}
        </p>
      )}
      <Button
        size="sm"
        variant="secondary"
        className="w-fit gap-1.5"
        onClick={() => applyMutation.mutate(outcome.files)}
      >
        Apply fix
      </Button>
    </div>
  );
}
