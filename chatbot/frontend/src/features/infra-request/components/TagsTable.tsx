"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FlatField } from "../utils/schemaFields";
import { fieldKey } from "../utils/schemaFields";

interface Props {
  fields: FlatField[];
  control: Control<Record<string, string>>;
  errors: FieldErrors<Record<string, string>>;
  disabled?: boolean;
}

const UNSET = "__unset__";

/**
 * Every schema's `tags` object is a fixed, well-known set of compliance
 * fields (environment/owner/costCenter/application/dataClassification) —
 * consolidating them into one table instead of five separate stacked
 * inputs matches how they're actually reviewed (as a tag set), and keeps
 * the rest of the form's field-by-field layout for attributes that aren't
 * a tag set.
 */
export function TagsTable({ fields, control, errors, disabled }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">Tags</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Tag</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => {
              const key = fieldKey(field.path);
              const error = errors[key]?.message as string | undefined;
              const tagName = field.path[field.path.length - 1];
              const options = field.schema.enum;

              return (
                <TableRow key={key}>
                  <TableCell className="align-top font-medium">
                    {tagName}
                    {!field.required && (
                      <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {options ? (
                      <Controller
                        name={key}
                        control={control}
                        render={({ field: rhf }) => (
                          <Select
                            value={field.required ? rhf.value : rhf.value || UNSET}
                            onValueChange={(value) =>
                              rhf.onChange(!field.required && value === UNSET ? "" : value)
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
                              <SelectValue placeholder={`Select ${tagName}`} />
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
                          <Input {...rhf} disabled={disabled} aria-invalid={Boolean(error)} />
                        )}
                      />
                    )}
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
