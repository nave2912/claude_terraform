"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCommitStatus } from "../hooks/useCommitStatus";
import { useChatStore } from "@/features/chat/store/chat.store";

const CHECK_ICON = {
  success: <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />,
  failure: <XCircle className="size-3.5 text-destructive" />,
  pending: <Loader2 className="size-3.5 animate-spin text-muted-foreground" />,
};

/**
 * Tracks the push->apply workflow run triggered by the merge commit, and
 * posts one consolidated result message into the chat once it settles —
 * this is the "once merged, track PR merge actions and get status of
 * completion" half of the feature; PrStatusIndicator covers the pre-merge
 * half.
 */
export function ApplyStatusIndicator({ sha }: { sha: string }) {
  const { data } = useCommitStatus(sha);
  const addMessage = useChatStore((s) => s.addMessage);
  const posted = useRef(false);

  useEffect(() => {
    if (!data || posted.current) return;
    if (data.overall !== "success" && data.overall !== "failure") return;
    posted.current = true;

    const lines = data.checks.map((c) => `- ${c.name}: ${c.state}`).join("\n");
    const heading =
      data.overall === "success"
        ? `**Apply completed successfully** for commit \`${sha.slice(0, 7)}\`.`
        : `**Apply failed** for commit \`${sha.slice(0, 7)}\` — check the workflow run for details.`;
    addMessage({ role: "bot", kind: "text", text: `${heading}\n\n${lines}` });
  }, [data, sha, addMessage]);

  if (!data) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Waiting for the apply workflow to start…
      </p>
    );
  }

  if (data.overall === "none") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Waiting for the apply workflow to start…
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {data.checks.map((check) => (
        <li key={check.name} className="flex items-center gap-1.5 text-xs">
          {CHECK_ICON[check.state]}
          <span className={check.state === "failure" ? "text-destructive" : "text-muted-foreground"}>
            {check.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
