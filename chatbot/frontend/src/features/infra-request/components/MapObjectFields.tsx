"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JsonSchemaProperty } from "@/types/schema";
import { classifyField } from "../utils/schemaTree";
import { getFieldError } from "../utils/formErrors";
import { humanLabel } from "../utils/schemaFields";

interface Props {
  name: string;
  displayName: string;
  valueSchema: JsonSchemaProperty;
  control: Control;
  errors: FieldErrors;
  disabled?: boolean;
}

interface Row {
  id: number;
  key: string;
  value: unknown;
}

let rowCounter = 0;

/**
 * An object with dynamic keys instead of a fixed property list (JSON
 * Schema's `additionalProperties: {...}` with no `properties`) — the same
 * "map keyed by a logical id" pattern this repo's own model files use at
 * the top level. Each row is fully local component state (not individual
 * RHF-registered fields), synced to one RHF field holding the whole
 * Record<string, value> — renaming a key would otherwise mean moving an
 * entire RHF subtree, which react-hook-form isn't built for.
 */
export function MapObjectFields({ name, displayName, valueSchema, control, errors, disabled }: Props) {
  const error = getFieldError(errors, name);
  const valueKind = classifyField(valueSchema);
  const isSimpleGroup = valueKind.kind === "group-table";
  const groupProps = isSimpleGroup ? Object.entries(valueKind.schema.properties ?? {}) : [];
  const groupRequired = isSimpleGroup ? (valueKind.schema.required ?? []) : [];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf }) => {
        const record = (rhf.value as Record<string, unknown>) ?? {};
        const rows: Row[] = Object.entries(record).map(([key, value]) => ({
          id: rowCounter++,
          key,
          value,
        }));

        function commit(nextRows: Row[]) {
          const nextRecord: Record<string, unknown> = {};
          for (const row of nextRows) {
            if (row.key) nextRecord[row.key] = row.value;
          }
          rhf.onChange(nextRecord);
        }

        function addRow() {
          const defaultValue = isSimpleGroup ? {} : valueKind.kind === "boolean" ? false : "";
          commit([...rows, { id: rowCounter++, key: "", value: defaultValue }]);
        }

        function updateRow(index: number, patch: Partial<Row>) {
          const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
          commit(next);
        }

        function removeRow(index: number) {
          commit(rows.filter((_, i) => i !== index));
        }

        return (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{humanLabel(displayName)}</p>
            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Key</TableHead>
                      {isSimpleGroup ? (
                        groupProps.map(([propName]) => <TableHead key={propName}>{humanLabel(propName)}</TableHead>)
                      ) : (
                        <TableHead>Value</TableHead>
                      )}
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.key}
                            onChange={(e) => updateRow(index, { key: e.target.value })}
                            disabled={disabled}
                            placeholder="key"
                          />
                        </TableCell>
                        {isSimpleGroup ? (
                          groupProps.map(([propName, propSchema]) => (
                            <TableCell key={propName}>
                              <LocalPrimitiveInput
                                schema={propSchema}
                                required={groupRequired.includes(propName)}
                                value={(row.value as Record<string, unknown> | undefined)?.[propName] ?? ""}
                                disabled={disabled}
                                onChange={(v) =>
                                  updateRow(index, { value: { ...(row.value as object), [propName]: v } })
                                }
                              />
                            </TableCell>
                          ))
                        ) : (
                          <TableCell>
                            <LocalPrimitiveInput
                              schema={valueSchema}
                              required
                              value={row.value ?? ""}
                              disabled={disabled}
                              onChange={(v) => updateRow(index, { value: v })}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => removeRow(index)} aria-label="Remove row">
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
              <Plus className="size-3.5" /> Add entry
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      }}
    />
  );
}

/** PrimitiveCellInput is RHF-Controller-based; map rows are plain local
 * state instead, so this is a small uncontrolled-by-RHF equivalent for
 * string/enum/number/boolean/raw-json values within a map row. */
function LocalPrimitiveInput({
  schema,
  required,
  value,
  disabled,
  onChange,
}: {
  schema: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  const kind = classifyField(schema);

  if (kind.kind === "boolean") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="size-4"
      />
    );
  }

  if (kind.kind === "enum") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
      >
        <option value="">{required ? "Select…" : "— none —"}</option>
        {kind.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (kind.kind === "group-table" || kind.kind === "nested-object" || kind.kind === "raw-json" || kind.kind === "array-primitive" || kind.kind === "array-object-table" || kind.kind === "map-object") {
    const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
    return (
      <Input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="JSON value"
      />
    );
  }

  return (
    <Input
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      type={kind.kind === "number" ? "number" : "text"}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
