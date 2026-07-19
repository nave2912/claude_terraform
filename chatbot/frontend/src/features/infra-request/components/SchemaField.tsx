"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import type { JsonSchemaProperty } from "@/types/schema";
import { classifyField } from "../utils/schemaTree";
import { getFieldError } from "../utils/formErrors";
import { humanLabel } from "../utils/schemaFields";
import { PrimitiveCellInput } from "./PrimitiveCellInput";

interface Props {
  name: string;
  displayName: string;
  schema: JsonSchemaProperty;
  required: boolean;
  control: Control;
  errors: FieldErrors;
  /** Overrides enum options — used for foreign-key fields resolved from /model-entries. */
  optionsOverride?: string[];
  disabled?: boolean;
}

/** One labeled string/enum/number/boolean field. Any other shape (object,
 * array, map, raw-json) is handled by a different component — see
 * SchemaObjectFields for the full dispatch table. */
export function SchemaField({ name, displayName, schema, required, control, errors, optionsOverride, disabled }: Props) {
  const error = getFieldError(errors, name);
  const kind = classifyField(schema);
  const label = humanLabel(displayName) + (required ? "" : " (optional)");

  if (kind.kind === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <PrimitiveCellInput name={name} schema={schema} required={required} control={control} disabled={disabled} />
        <Label htmlFor={name} className="font-normal">
          {label}
        </Label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <PrimitiveCellInput
        name={name}
        schema={schema}
        required={required}
        control={control}
        disabled={disabled}
        ariaInvalid={Boolean(error)}
        optionsOverride={optionsOverride}
        placeholder={optionsOverride ? `Select ${humanLabel(displayName).toLowerCase()}` : undefined}
      />
      {schema.description && !error && <p className="text-xs text-muted-foreground">{schema.description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
