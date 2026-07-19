"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JsonSchemaProperty } from "@/types/schema";
import { getFieldError } from "../utils/formErrors";
import { humanLabel } from "../utils/schemaFields";
import { PrimitiveCellInput } from "./PrimitiveCellInput";

interface Props {
  /** Display label for the group, e.g. "Tags". */
  label: string;
  name: string;
  schema: JsonSchemaProperty;
  control: Control;
  errors: FieldErrors;
  disabled?: boolean;
}

/**
 * Any object whose properties are ALL primitive leaves (string/enum/
 * number/boolean — see classifyField's "group-table" case) renders as one
 * Tag/Value-style table instead of N stacked inputs — this is generic, not
 * special-cased to a field literally named "tags"; any schema with a
 * similarly-shaped nested object gets the same treatment automatically.
 */
export function PrimitiveGroupTable({ label, name, schema, control, errors, disabled }: Props) {
  const required = schema.required ?? [];
  const entries = Object.entries(schema.properties ?? {});
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Field</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([propName, propSchema]) => {
              const fieldName = `${name}.${propName}`;
              const fieldRequired = required.includes(propName);
              const error = getFieldError(errors, fieldName);

              return (
                <TableRow key={fieldName}>
                  <TableCell className="align-top font-medium">
                    {humanLabel(propName)}
                    {!fieldRequired && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
                  </TableCell>
                  <TableCell>
                    <PrimitiveCellInput
                      name={fieldName}
                      schema={propSchema}
                      required={fieldRequired}
                      control={control}
                      disabled={disabled}
                      ariaInvalid={Boolean(error)}
                      placeholder={`Select ${propName}`}
                    />
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
