"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { usePrStatus } from "../hooks/usePrStatus";
import { MergePrButton } from "./MergePrButton";
import { useChatStore } from "@/features/chat/store/chat.store";

const CHECK_ICON = {
  success: <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />,
  failure: <XCircle className="size-3.5 text-destructive" />,
  pending: <Loader2 className="size-3.5 animate-spin text-muted-foreground" />,
};

interface Props {
  prNumber: number;
  branch: string;
}

/**
 * Polls the PR's CI status (the pull_request-triggered validate/plan
 * workflow) and only renders the merge button once every check reports
 * success — this is the actual gate the feature asks for: no green light,
 * no merge option shown at all, not even disabled. Once checks settle
 * (pass or fail), posts one consolidated summary message into the chat —
 * including the real `terraform plan` line, not just pass/fail icons —
 * so a reviewer can decide from chat instead of clicking through to
 * GitHub Actions.
 */
export function PrStatusIndicator({ prNumber, branch }: Props) {
  const { data, isLoading } = usePrStatus(prNumber);
  const addMessage = useChatStore((s) => s.addMessage);
  const posted = useRef(false);

  useEffect(() => {
    if (!data || posted.current) return;
    if (data.overall !== "success" && data.overall !== "failure") return;
    posted.current = true;

    const lines = data.checks.map((c) => `- ${c.name}: ${c.state}`).join("\n");
    const planLine = data.planSummary ? `\n\n**Plan:** ${data.planSummary}` : "";
    const heading =
      data.overall === "success"
        ? `**PR #${prNumber} checks passed.**`
        : `**PR #${prNumber} checks failed** — merge is unavailable until this is fixed.`;
    addMessage({ role: "bot", kind: "text", text: `${heading}\n\n${lines}${planLine}` });
  }, [data, prNumber, addMessage]);

  if (isLoading || !data) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Checking PR status…
      </p>
    );
  }

  if (data.overall === "none") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CircleDashed className="size-3.5" /> Waiting for CI checks to start…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
      {data.overall === "pending" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Checks running — merge option appears once they pass.
        </p>
      )}
      {data.overall === "failure" && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="size-3.5" /> Checks failed — fix the PR before it can be merged.
        </p>
      )}
      {data.overall === "success" && <MergePrButton prNumber={prNumber} branch={branch} />}
    </div>
  );
}
