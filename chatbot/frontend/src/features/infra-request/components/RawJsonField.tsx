"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JsonSchemaProperty } from "@/types/schema";
import { getFieldError } from "../utils/formErrors";
import { humanLabel } from "../utils/schemaFields";

interface Props {
  name: string;
  displayName: string;
  schema: JsonSchemaProperty;
  required: boolean;
  control: Control;
  errors: FieldErrors;
  disabled?: boolean;
}

/**
 * Fallback for shapes with no sane bespoke widget — arrays of arrays,
 * polymorphic (oneOf/anyOf) array items, or genuinely untyped/"any"
 * fields. This is the same boundary every schema-form tool draws at some
 * depth; real Terraform module variables essentially never hit it.
 */
export function RawJsonField({ name, displayName, schema, required, control, errors, disabled }: Props) {
  const error = getFieldError(errors, name);
  const label = humanLabel(displayName) + (required ? "" : " (optional)");

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label} (raw JSON)</Label>
      <Controller
        name={name}
        control={control}
        render={({ field: rhf }) => (
          <Textarea
            id={name}
            {...rhf}
            disabled={disabled}
            rows={3}
            aria-invalid={Boolean(error)}
            placeholder="[]"
            className="font-mono text-xs"
          />
        )}
      />
      {schema.description && !error && <p className="text-xs text-muted-foreground">{schema.description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
