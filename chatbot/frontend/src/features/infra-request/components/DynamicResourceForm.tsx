"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { detectForeignKeyRef, fieldKey, unflattenValues } from "../utils/schemaFields";
import { SchemaField } from "./SchemaField";
import { ForeignKeyField } from "./ForeignKeyField";

interface Props {
  resourceType: ResourceTypeInfo;
  allowedEnvironments: string[];
  defaultEnvironment?: string;
  onSubmit: (input: StructuredProposalInput) => void;
  submitting?: boolean;
}

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * The single-submit form the whole feature is built around: every required
 * field from the resource's schema, generated dynamically (see
 * useSchemaForm), plus the two pipeline-level fields the schema itself
 * doesn't define (environment for routing, key as the JSON map id).
 * Nothing here is free text sent to an LLM — this is what actually reaches
 * POST /propose-structured, validated client-side by zod and re-validated
 * server-side by the same ajv schema either way.
 */
export function DynamicResourceForm({
  resourceType,
  allowedEnvironments,
  defaultEnvironment,
  onSubmit,
  submitting,
}: Props) {
  const [environment, setEnvironment] = useState(defaultEnvironment ?? allowedEnvironments[0]);
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  const { form, fields } = useSchemaForm(resourceType, environment);
  const { control, handleSubmit, formState, setValue } = form;

  useEffect(() => {
    for (const field of fields) {
      if (field.path[field.path.length - 1] === "environment" && field.schema.enum?.includes(environment)) {
        setValue(fieldKey(field.path), environment);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment]);

  const keyError = keyTouched && !KEY_PATTERN.test(key) ? "Lowercase letters, numbers, underscores; must start with a letter." : null;

  const submit = handleSubmit((values) => {
    setKeyTouched(true);
    if (!KEY_PATTERN.test(key)) return;
    onSubmit({
      resourceType: resourceType.resourceType,
      environment,
      key,
      fields: unflattenValues(values),
    });
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="key">Logical key (internal id, e.g. &quot;analytics_dev&quot;)</Label>
            <Input
              id="key"
              value={key}
              disabled={submitting}
              onChange={(e) => setKey(e.target.value)}
              onBlur={() => setKeyTouched(true)}
              aria-invalid={Boolean(keyError)}
            />
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
          </div>

          {fields.map((field) => {
            const fk = detectForeignKeyRef(field.schema);
            return fk ? (
              <ForeignKeyField
                key={fieldKey(field.path)}
                field={field}
                refResourceType={fk.resourceType}
                environment={environment}
                control={control}
                errors={formState.errors}
              />
            ) : (
              <SchemaField
                key={fieldKey(field.path)}
                field={field}
                control={control}
                errors={formState.errors}
                disabled={submitting}
              />
            );
          })}

          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? "Validating…" : "Preview change"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
