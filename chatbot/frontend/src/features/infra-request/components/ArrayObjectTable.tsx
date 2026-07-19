"use client";

import { useFieldArray, type Control, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JsonSchemaProperty } from "@/types/schema";
import { buildDefaultValue } from "../utils/schemaTree";
import { getFieldError } from "../utils/formErrors";
import { humanLabel } from "../utils/schemaFields";
import { PrimitiveCellInput } from "./PrimitiveCellInput";

interface Props {
  name: string;
  displayName: string;
  itemSchema: JsonSchemaProperty;
  control: Control;
  errors: FieldErrors;
  disabled?: boolean;
}

/**
 * Array of objects whose fields are all primitive (e.g. VM data disks: a
 * list of { name, sizeGb, diskType } rows) — rendered as one editable
 * table with an "Add row" button, rather than a repeated stack of
 * per-item field groups. This is the concrete "use table options for
 * array of things" behavior.
 */
export function ArrayObjectTable({ name, displayName, itemSchema, control, errors, disabled }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const properties = Object.entries(itemSchema.properties ?? {});
  const requiredProps = itemSchema.required ?? [];

  function addRow() {
    const defaults: Record<string, unknown> = {};
    for (const [propName, propSchema] of properties) {
      defaults[propName] = buildDefaultValue(propSchema, { name: propName });
    }
    append(defaults);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{humanLabel(displayName)}</p>
      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {properties.map(([propName]) => (
                  <TableHead key={propName}>{humanLabel(propName)}</TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((row, rowIndex) => (
                <TableRow key={row.id}>
                  {properties.map(([propName, propSchema]) => {
                    const fieldName = `${name}.${rowIndex}.${propName}`;
                    const fieldRequired = requiredProps.includes(propName);
                    const error = getFieldError(errors, fieldName);
                    return (
                      <TableCell key={propName}>
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
                    );
                  })}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => remove(rowIndex)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={addRow} disabled={disabled} className="w-fit gap-1.5">
        <Plus className="size-3.5" /> Add row
      </Button>
    </div>
  );
}
