"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FlatField } from "../utils/schemaFields";
import { fieldKey, humanLabel } from "../utils/schemaFields";

interface Props {
  field: FlatField;
  control: Control<Record<string, string>>;
  errors: FieldErrors<Record<string, string>>;
  /** Overrides enum options — used for foreign-key fields resolved from /model-entries. */
  optionsOverride?: string[];
  disabled?: boolean;
}

export function SchemaField({ field, control, errors, optionsOverride, disabled }: Props) {
  const key = fieldKey(field.path);
  const error = errors[key]?.message as string | undefined;
  const options = optionsOverride ?? field.schema.enum;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={key}>{humanLabel(field.path)}</Label>
      {options ? (
        <Controller
          name={key}
          control={control}
          render={({ field: rhf }) => (
            <Select value={rhf.value} onValueChange={rhf.onChange} disabled={disabled}>
              <SelectTrigger id={key} className="w-full" aria-invalid={Boolean(error)}>
                <SelectValue placeholder={`Select ${humanLabel(field.path).toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      ) : (
        <Controller
          name={key}
          control={control}
          render={({ field: rhf }) => (
            <Input
              id={key}
              {...rhf}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              placeholder={field.schema.pattern ? `pattern: ${field.schema.pattern}` : undefined}
            />
          )}
        />
      )}
      {field.schema.description && !error && (
        <p className="text-xs text-muted-foreground">{field.schema.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
