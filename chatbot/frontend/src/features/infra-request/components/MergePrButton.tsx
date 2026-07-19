"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GitMerge, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { infraRequestApi } from "../services/infraRequest.api";
import { ApplyStatusIndicator } from "./ApplyStatusIndicator";

interface Props {
  prNumber: number;
  branch: string;
}

/**
 * Requires two clicks ("Merge pull request" -> "Confirm merge?") before it
 * actually calls POST /merge-pr — this is still a human decision, just made
 * in the chat UI instead of on GitHub's PR page, so it gets the same
 * "are you sure" friction a destructive-ish action deserves. Merging here
 * does not bypass whatever environment approval gate is configured on the
 * repo for the push->apply workflow; it only automates the merge click
 * itself.
 */
export function MergePrButton({ prNumber, branch }: Props) {
  const [confirming, setConfirming] = useState(false);

  const mergeMutation = useMutation({
    mutationFn: () => infraRequestApi.mergePullRequest({ prNumber, branch }),
  });

  if (mergeMutation.data?.status === "merged") {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" /> Merged (commit {mergeMutation.data.sha.slice(0, 7)}) — the branch was
          deleted.
        </p>
        <ApplyStatusIndicator sha={mergeMutation.data.sha} />
      </div>
    );
  }

  if (mergeMutation.data?.status === "merge_failed" || mergeMutation.isError) {
    const message =
      mergeMutation.data?.status === "merge_failed"
        ? mergeMutation.data.error
        : mergeMutation.error instanceof Error
          ? mergeMutation.error.message
          : String(mergeMutation.error);
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-4" /> Merge failed: {message}
        </p>
        <Button size="sm" variant="secondary" onClick={() => mergeMutation.mutate()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant={confirming ? "destructive" : "outline"}
      disabled={mergeMutation.isPending}
      onClick={() => {
        if (confirming) {
          mergeMutation.mutate();
        } else {
          setConfirming(true);
        }
      }}
      className="w-fit gap-1.5"
    >
      <GitMerge className="size-3.5" />
      {mergeMutation.isPending ? "Merging…" : confirming ? "Confirm merge?" : "Merge pull request"}
    </Button>
  );
}
