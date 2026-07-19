"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceTypeInfo, StructuredProposalInput } from "@/types/schema";
import { useSchemaForm } from "../hooks/useSchemaForm";
import { coerceSubmissionValue, findEnumFieldPaths } from "../utils/schemaTree";
import { SchemaObjectFields } from "./SchemaObjectFields";

interface Props {
  resourceType: ResourceTypeInfo;
  allowedEnvironments: string[];
  defaultEnvironment?: string;
  onSubmit: (input: StructuredProposalInput) => void;
  submitting?: boolean;
}

/**
 * Derives the JSON map id mergeEntry() needs (e.g. "primary" under
 * resource_groups) from the entry's own `name` field, so the user is
 * never asked for it separately — the schema itself has no "key" concept,
 * it's purely a pipeline-level id. A short suffix keeps two requests with
 * the same name from silently overwriting each other's entry.
 */
function deriveKey(values: Record<string, unknown>, fallback: string): string {
  const raw = typeof values.name === "string" && values.name ? values.name : fallback;
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "entry";
  const base = /^[a-z]/.test(slug) ? slug : `r_${slug}`;
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}_${suffix}`;
}

/**
 * The single-submit form the whole feature is built around: every field
 * the resource's schema defines, generated dynamically and recursively
 * (see SchemaObjectFields + utils/schemaTree.ts) — nested objects, arrays
 * of primitives, arrays of objects (tables), dynamic-key maps, and a raw
 * JSON fallback for anything with no sane bespoke widget. Plus the one
 * pipeline-level field the schema itself doesn't define — environment,
 * for routing which models/<env>/*.json file this writes to (the logical
 * key is derived automatically, see deriveKey). Nothing here is free text
 * sent to an LLM — this is what actually reaches POST /propose-structured,
 * validated client-side by zod and re-validated server-side by the same
 * ajv schema either way.
 */
export function DynamicResourceForm({
  resourceType,
  allowedEnvironments,
  defaultEnvironment,
  onSubmit,
  submitting,
}: Props) {
  const [environment, setEnvironment] = useState(defaultEnvironment ?? allowedEnvironments[0]);

  const { form, entrySchema } = useSchemaForm(resourceType, environment);
  const { control, handleSubmit, formState, setValue } = form;

  useEffect(() => {
    for (const path of findEnumFieldPaths(entrySchema, "environment")) {
      setValue(path, environment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment]);

  const submit = handleSubmit((values) => {
    const fields = coerceSubmissionValue(entrySchema, values, true) as Record<string, unknown>;
    const key = deriveKey(values, resourceType.resourceType);
    onSubmit({ resourceType: resourceType.resourceType, environment, key, fields });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          New {resourceType.resourceType.replace(/-/g, " ")} — fill in every field, then submit once.
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="environment">Environment</Label>
            <Select
              value={environment}
              onValueChange={(value) => {
                if (value) setEnvironment(value);
              }}
              disabled={submitting}
            >
              <SelectTrigger id="environment" className="w-full">
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

          <SchemaObjectFields
            schema={entrySchema}
            pathPrefix={[]}
            environment={environment}
            control={control}
            errors={formState.errors}
            disabled={submitting}
          />

          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? "Validating…" : "Preview change"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
