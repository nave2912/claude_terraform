"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { useModelEntries } from "../hooks/useModelEntries";
import { SchemaField } from "./SchemaField";
import { humanLabel } from "../utils/schemaFields";

interface Props {
  name: string;
  displayName: string;
  refResourceType: string;
  environment: string;
  control: Control;
  errors: FieldErrors;
}

/**
 * Resolves a foreign-key field (e.g. storage-account's resource_group_key)
 * against real data via GET /model-entries, rather than letting the user
 * free-type a key that may not exist. Isolated as its own component
 * because the useModelEntries hook can only be called unconditionally at
 * a component's top level, and this field only exists when the schema
 * says so (see detectForeignKeyRef).
 */
export function ForeignKeyField({ name, displayName, refResourceType, environment, control, errors }: Props) {
  const { data, isLoading } = useModelEntries(refResourceType, environment);
  const options = data ? Object.keys(data.entries) : [];

  if (!isLoading && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">{humanLabel(displayName)}</p>
        <p className="text-xs text-destructive">
          No existing &quot;{refResourceType}&quot; entries found in {environment} yet — create one first,
          then come back to this request.
        </p>
      </div>
    );
  }

  return (
    <SchemaField
      name={name}
      displayName={displayName}
      schema={{ type: "string" }}
      required
      control={control}
      errors={errors}
      optionsOverride={options}
      disabled={isLoading}
    />
  );
}
