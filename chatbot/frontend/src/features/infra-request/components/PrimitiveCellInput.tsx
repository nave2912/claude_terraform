"use client";

import { Controller, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JsonSchemaProperty } from "@/types/schema";
import { classifyField } from "../utils/schemaTree";

interface Props {
  name: string;
  schema: JsonSchemaProperty;
  required: boolean;
  control: Control;
  disabled?: boolean;
  ariaInvalid?: boolean;
  optionsOverride?: string[];
  placeholder?: string;
}

const UNSET = "__unset__";

/**
 * The bare leaf input control (no label/description/error wrapper) for a
 * string/enum/number/boolean field — shared by SchemaField (a single
 * labeled field), PrimitiveGroupTable (a Tag/Value table row), and
 * ArrayObjectTable (a table cell inside an array-of-objects row), so the
 * string/enum/number/boolean dispatch logic exists exactly once.
 */
export function PrimitiveCellInput({ name, schema, required, control, disabled, ariaInvalid, optionsOverride, placeholder }: Props) {
  const kind = classifyField(schema);
  const options = optionsOverride ?? (kind.kind === "enum" ? kind.options : undefined);

  if (kind.kind === "boolean") {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: rhf }) => (
          <Checkbox checked={Boolean(rhf.value)} onCheckedChange={(checked) => rhf.onChange(checked === true)} disabled={disabled} />
        )}
      />
    );
  }

  if (options) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: rhf }) => (
          <Select
            value={required ? rhf.value : rhf.value || UNSET}
            onValueChange={(value) => rhf.onChange(!required && value === UNSET ? "" : value)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full" aria-invalid={ariaInvalid}>
              <SelectValue placeholder={placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {!required && <SelectItem value={UNSET}>— none —</SelectItem>}
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    );
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf }) => (
        <Input
          {...rhf}
          type={kind.kind === "number" ? "number" : "text"}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          placeholder={placeholder ?? (schema.pattern ? `pattern: ${schema.pattern}` : undefined)}
        />
      )}
    />
  );
}
