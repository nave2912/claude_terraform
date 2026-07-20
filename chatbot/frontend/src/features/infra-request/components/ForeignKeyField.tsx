"use client";

import { useEffect, useState } from "react";
import type { Control, FieldErrors } from "react-hook-form";
import { useModelEntries } from "../hooks/useModelEntries";
import { SchemaField } from "./SchemaField";

interface Props {
  name: string;
  displayName: string;
  refResourceType: string;
  environment: string;
  control: Control;
  errors: FieldErrors;
}

/**
 * Resolves a foreign-key field (e.g. storage-account's resource_group_name)
 * against real data via GET /model-entries, so the common case is picking
 * from a dropdown instead of free-typing a name that may not exist. Isolated
 * as its own component because the useModelEntries hook can only be called
 * unconditionally at a component's top level, and this field only exists
 * when the schema says so (see detectForeignKeyRef).
 *
 * Options are each entry's real `.name` (e.g. "azure-learning-dev"), not
 * its logical map key (e.g. "primary") — the submitted value must match
 * what's actually in Azure, since Terraform now resolves the target by
 * name, not by resource-group.json's internal id.
 *
 * A manual-entry toggle covers the case where the target hasn't been
 * created as a model entry yet (e.g. a resource group that exists in
 * Azure but was never added to resource-group.json) — the dropdown alone
 * would otherwise dead-end the form.
 */
export function ForeignKeyField({ name, displayName, refResourceType, environment, control, errors }: Props) {
  const { data, isLoading } = useModelEntries(refResourceType, environment);
  const options = data
    ? Object.values(data.entries)
        .map((entry) => (entry as { name?: string }).name)
        .filter((n): n is string => Boolean(n))
    : [];

  const [manualEntry, setManualEntry] = useState(false);

  // If there's nothing to pick from, default straight to manual entry
  // instead of showing an empty, unusable dropdown.
  useEffect(() => {
    if (!isLoading && options.length === 0) setManualEntry(true);
  }, [isLoading, options.length]);

  return (
    <div className="flex flex-col gap-1.5">
      <SchemaField
        name={name}
        displayName={displayName}
        schema={{ type: "string" }}
        required
        control={control}
        errors={errors}
        optionsOverride={manualEntry ? undefined : options}
        disabled={isLoading}
      />
      {options.length > 0 && (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline"
          onClick={() => setManualEntry((v) => !v)}
        >
          {manualEntry ? "Choose from existing instead" : "Enter manually instead"}
        </button>
      )}
      {!isLoading && options.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No existing &quot;{refResourceType}&quot; entries found in {environment} yet — enter the name manually.
        </p>
      )}
    </div>
  );
}
