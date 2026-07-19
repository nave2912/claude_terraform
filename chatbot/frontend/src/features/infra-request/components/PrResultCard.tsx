import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProposeOutcome } from "@/types/schema";
import { MergePrButton } from "./MergePrButton";

function prNumberFromUrl(prUrl: string): number | null {
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function PrResultCard({ outcome }: { outcome: ProposeOutcome }) {
  if (outcome.status === "pr_opened") {
    const prNumber = prNumberFromUrl(outcome.prUrl);
    return (
      <Card className="border-emerald-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> Pull request opened
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <a
            href={outcome.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            {outcome.prUrl} <ExternalLink className="size-3.5" />
          </a>
          <p className="text-muted-foreground">
            Branch <Badge variant="secondary">{outcome.branch}</Badge> — review the diff before merging. Merging
            still triggers this repo&apos;s normal push→apply workflow and any environment approval gate configured
            on it.
          </p>
          {prNumber && <MergePrButton prNumber={prNumber} branch={outcome.branch} />}
        </CardContent>
      </Card>
    );
  }

  if (outcome.status === "pushed_no_pr") {
    return (
      <Card className="border-amber-500/40">
        <CardHeader>
          <CardTitle className="text-base">Branch pushed, PR not opened automatically</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Branch <Badge variant="secondary">{outcome.branch}</Badge> pushed.{" "}
            {outcome.compareUrl ? (
              <a href={outcome.compareUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                Open a pull request manually
              </a>
            ) : (
              "Open one manually on GitHub."
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (outcome.status === "environment_blocked") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" /> Environment not allowed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          &quot;{outcome.environment}&quot; isn&apos;t permitted. Allowed: {outcome.allowed.join(", ")}.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="size-4" /> Couldn&apos;t complete the request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-inside list-disc text-sm text-destructive">
          {outcome.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
