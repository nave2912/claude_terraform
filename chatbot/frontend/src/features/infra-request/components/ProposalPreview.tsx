"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import type { PreviewOutcome, StructuredProposalInput } from "@/types/schema";

interface Props {
  outcome: PreviewOutcome;
  input: StructuredProposalInput;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function ProposalPreview({ outcome, onConfirm, onCancel, submitting }: Props) {
  if (outcome.status !== "valid_proposal") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" /> Schema validation failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-destructive">
            {outcome.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={onCancel}>
            Start over
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Ready to open a PR — <code className="text-sm font-normal">{outcome.wouldWriteTo.split(/[\\/]/).slice(-2).join("/")}</code>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CodeBlock code={outcome.mergedFileContent} language="json" />
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? "Opening pull request…" : "Open pull request"}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}
