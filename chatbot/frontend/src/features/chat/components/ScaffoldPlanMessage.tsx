"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { infraRequestApi } from "@/features/infra-request/services/infraRequest.api";
import { useSchemaInfo } from "@/features/infra-request/hooks/useSchemaInfo";
import { ScaffoldFieldList } from "@/features/infra-request/components/ScaffoldFieldList";
import { useChatStore } from "../store/chat.store";
import type { ChatMessage } from "../types";

/**
 * Renders a `/tfmodules` scaffold plan inline in the chat transcript —
 * mandatory/optional fields sourced from the azurerm provider's own
 * schema, plus an environment picker and a confirm button that opens a PR
 * (module + schema + environment wiring + a starter example entry, see
 * chatbot/backend/src/pipeline/scaffoldModule.ts). Result is posted back as
 * a new "scaffold-result" message, same pattern as
 * ResourceFormMessage -> preview -> result.
 */
export function ScaffoldPlanMessage({ message }: { message: Extract<ChatMessage, { kind: "scaffold-plan" }> }) {
  const { plan } = message;
  const addMessage = useChatStore((s) => s.addMessage);
  const schemaInfoQuery = useSchemaInfo();
  const allowedEnvironments = schemaInfoQuery.data?.allowedEnvironments ?? ["dev"];
  const [environment, setEnvironment] = useState(allowedEnvironments[0]);

  const generateMutation = useMutation({
    mutationFn: () => {
      // Carry the descriptions the user already reviewed here through to
      // generation — otherwise the generated variables.tf only gets a
      // description when the azurerm provider's own schema happens to
      // supply one (rare), which trips this repo's tflint
      // terraform_documented_variables rule on nearly every field.
      const fieldDescriptions: Record<string, string> = {};
      // Carry example values through the same way — Claude's own real
      // (not generic-placeholder) suggestion for fields like an
      // "application_type"-style enum, computed once during the plan step
      // (see planPrompt.ts's exampleValue instructions), otherwise a fresh
      // scaffold silently falls back to a value that fails terraform plan.
      const fieldExamples: Record<string, string> = {};
      for (const f of [...plan.mandatoryFields, ...plan.optionalFields]) {
        if (f.description) fieldDescriptions[f.name] = f.description;
        if (f.exampleValue) fieldExamples[f.name] = f.exampleValue;
      }
      return infraRequestApi.scaffoldModuleGenerate(
        plan.providerResourceType,
        environment,
        fieldDescriptions,
        fieldExamples
      );
    },
    onSuccess: (outcome) => {
      addMessage({ role: "bot", kind: "scaffold-result", outcome });
    },
    onError: (err) => {
      addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
    },
  });

  return (
    // Card's base styling clips overflow (rounded-corner masking) — a
    // resource with many arguments (e.g. a VM has ~50) produces far more
    // content than fits in one card, so without overriding to visible +
    // scrolling the field list internally, the tail end (remaining fields
    // and the button below them) silently disappears with no scrollbar.
    <Card className="max-w-lg overflow-visible border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          <span className="font-mono">{plan.providerResourceType}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-xs text-muted-foreground">{plan.summary}</p>
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          <ScaffoldFieldList fields={plan.mandatoryFields} label="Mandatory fields" />
          <ScaffoldFieldList fields={plan.optionalFields} label="Optional fields" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scaffold-environment" className="text-xs">
            Environment
          </Label>
          <Select
            value={environment}
            onValueChange={(value) => {
              if (value) setEnvironment(value);
            }}
            disabled={generateMutation.isPending || generateMutation.isSuccess}
          >
            <SelectTrigger id="scaffold-environment" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedEnvironments.map((env) => (
                <SelectItem key={env} value={env}>
                  {env}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={generateMutation.isPending || generateMutation.isSuccess}
          onClick={() => generateMutation.mutate()}
          className="w-fit gap-1.5"
        >
          <GitBranch className="size-3.5" />
          {generateMutation.isPending ? "Scaffolding…" : "Scaffold & open PR"}
        </Button>
      </CardContent>
    </Card>
  );
}
