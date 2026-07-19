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

/** Sentinel for "no selection" — base-ui's Select doesn't accept a literal
 * empty-string item value, so an optional enum field's "leave blank"
 * option is represented by this and translated to "" on change. */
const UNSET = "__unset__";

export function SchemaField({ field, control, errors, optionsOverride, disabled }: Props) {
  const key = fieldKey(field.path);
  const error = errors[key]?.message as string | undefined;
  const options = optionsOverride ?? field.schema.enum;
  const label = humanLabel(field.path) + (field.required ? "" : " (optional)");

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={key}>{label}</Label>
      {options ? (
        <Controller
          name={key}
          control={control}
          render={({ field: rhf }) => (
            <Select
              value={field.required ? rhf.value : rhf.value || UNSET}
              onValueChange={(value) => rhf.onChange(!field.required && value === UNSET ? "" : value)}
              disabled={disabled}
            >
              <SelectTrigger id={key} className="w-full" aria-invalid={Boolean(error)}>
                <SelectValue placeholder={`Select ${humanLabel(field.path).toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {!field.required && <SelectItem value={UNSET}>— none —</SelectItem>}
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
