"use client";

import { useState } from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JsonSchemaProperty } from "@/types/schema";
import { classifyField } from "../utils/schemaTree";
import { getFieldError } from "../utils/formErrors";
import { humanLabel } from "../utils/schemaFields";

interface Props {
  name: string;
  displayName: string;
  itemSchema: JsonSchemaProperty;
  required: boolean;
  control: Control;
  errors: FieldErrors;
  disabled?: boolean;
}

/** Array of primitives (e.g. a list of redirect URIs) — an add/remove chip
 * list bound to a plain string[]/number[], not react-hook-form's
 * useFieldArray (which expects array items to be objects). */
export function ArrayPrimitiveList({ name, displayName, itemSchema, required, control, errors, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const error = getFieldError(errors, name);
  const itemKind = classifyField(itemSchema);
  const label = humanLabel(displayName) + (required ? "" : " (optional)");

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: rhf }) => {
        const values: unknown[] = Array.isArray(rhf.value) ? rhf.value : [];

        function addDraft() {
          if (!draft.trim() || disabled) return;
          rhf.onChange([...values, draft.trim()]);
          setDraft("");
        }

        function removeAt(index: number) {
          rhf.onChange(values.filter((_, i) => i !== index));
        }

        return (
          <div className="flex flex-col gap-1.5">
            <Label>{label}</Label>
            {values.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {values.map((v, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {String(v)}
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      disabled={disabled}
                      aria-label={`Remove ${v}`}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                type={itemKind.kind === "number" ? "number" : "text"}
                disabled={disabled}
                placeholder="Add a value and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraft();
                  }
                }}
              />
              <Button type="button" variant="secondary" size="icon" onClick={addDraft} disabled={disabled}>
                <Plus className="size-4" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      }}
    />
  );
}
