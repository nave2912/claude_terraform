import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrStatusIndicator } from "@/features/infra-request/components/PrStatusIndicator";
import type { ChatMessage } from "../types";

function prNumberFromUrl(prUrl: string): number | null {
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Terminal result of a `/tfmodules` scaffold — mirrors PrResultCard's
 * shape but for ScaffoldGenerateOutcome's distinct status union. */
export function ScaffoldResultMessage({ message }: { message: Extract<ChatMessage, { kind: "scaffold-result" }> }) {
  const { outcome } = message;

  if (outcome.status === "pr_opened") {
    const prNumber = prNumberFromUrl(outcome.prUrl);
    return (
      <Card className="max-w-lg border-emerald-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> Module scaffolded
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="font-mono">{outcome.moduleName}</span> —{" "}
            <a
              href={outcome.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              view PR <ExternalLink className="size-3.5" />
            </a>
          </p>
          <p className="text-muted-foreground">
            Branch <Badge variant="secondary">{outcome.branch}</Badge> — this PR only adds the module + schema;
            wiring it into an environment&apos;s main.tf and adding example entries are separate manual steps.
          </p>
          {prNumber && <PrStatusIndicator prNumber={prNumber} branch={outcome.branch} />}
        </CardContent>
      </Card>
    );
  }

  if (outcome.status === "pushed_no_pr") {
    return (
      <Card className="max-w-lg border-amber-500/40">
        <CardHeader>
          <CardTitle className="text-base">Branch pushed, PR not opened automatically</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Branch <Badge variant="secondary">{outcome.branch}</Badge>{" "}
          {outcome.compareUrl ? (
            <a href={outcome.compareUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
              Open a pull request manually
            </a>
          ) : (
            "Open one manually on GitHub."
          )}
        </CardContent>
      </Card>
    );
  }

  const message2 =
    outcome.status === "denied"
      ? `${outcome.resourceType}: ${outcome.reason}`
      : outcome.status === "unknown_resource_type"
        ? `"${outcome.resourceType}" isn't a known azurerm resource type.`
        : outcome.errors.join(", ");

  return (
    <Card className="max-w-lg border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="size-4" /> Couldn&apos;t scaffold this module
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-destructive">{message2}</CardContent>
    </Card>
  );
}
