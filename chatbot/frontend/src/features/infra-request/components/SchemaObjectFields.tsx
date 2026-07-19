"use client";

import type { Control, FieldErrors } from "react-hook-form";
import type { JsonSchemaProperty } from "@/types/schema";
import { classifyField } from "../utils/schemaTree";
import { detectForeignKeyRef, humanLabel } from "../utils/schemaFields";
import { SchemaField } from "./SchemaField";
import { ForeignKeyField } from "./ForeignKeyField";
import { PrimitiveGroupTable } from "./PrimitiveGroupTable";
import { ArrayPrimitiveList } from "./ArrayPrimitiveList";
import { ArrayObjectTable } from "./ArrayObjectTable";
import { MapObjectFields } from "./MapObjectFields";
import { RawJsonField } from "./RawJsonField";

interface Props {
  schema: JsonSchemaProperty;
  /** RHF dot-path prefix, e.g. [] at the entry root, ["networkProfile"] one level in. */
  pathPrefix: string[];
  environment: string;
  control: Control;
  errors: FieldErrors;
  disabled?: boolean;
}

/**
 * Recursively renders every property of an object schema, dispatching
 * each one to the right widget via classifyField (schemaTree.ts) — this
 * is the single place that decides "field vs. table vs. section vs. raw
 * JSON" for the whole form, so it works for any schema in
 * models/schema/*.schema.json without per-resource-type code.
 */
export function SchemaObjectFields({ schema, pathPrefix, environment, control, errors, disabled }: Props) {
  const required = schema.required ?? [];

  return (
    <>
      {Object.entries(schema.properties ?? {}).map(([propName, propSchema]) => {
        const path = [...pathPrefix, propName];
        const name = path.join(".");
        const isRequired = required.includes(propName);
        const fk = detectForeignKeyRef(propSchema);
        const kind = classifyField(propSchema);

        if (fk && kind.kind === "string") {
          return (
            <ForeignKeyField
              key={name}
              name={name}
              displayName={propName}
              refResourceType={fk.resourceType}
              environment={environment}
              control={control}
              errors={errors}
            />
          );
        }

        switch (kind.kind) {
          case "string":
          case "enum":
          case "number":
          case "boolean":
            return (
              <SchemaField
                key={name}
                name={name}
                displayName={propName}
                schema={propSchema}
                required={isRequired}
                control={control}
                errors={errors}
                disabled={disabled}
              />
            );

          case "group-table":
            return (
              <PrimitiveGroupTable
                key={name}
                label={humanLabel(propName)}
                name={name}
                schema={kind.schema}
                control={control}
                errors={errors}
                disabled={disabled}
              />
            );

          case "nested-object":
            return (
              <div key={name} className="flex flex-col gap-4 rounded-lg border p-3">
                <p className="text-sm font-medium">{humanLabel(propName)}</p>
                <SchemaObjectFields
                  schema={kind.schema}
                  pathPrefix={path}
                  environment={environment}
                  control={control}
                  errors={errors}
                  disabled={disabled}
                />
              </div>
            );

          case "map-object":
            return (
              <MapObjectFields
                key={name}
                name={name}
                displayName={propName}
                valueSchema={kind.valueSchema}
                control={control}
                errors={errors}
                disabled={disabled}
              />
            );

          case "array-primitive":
            return (
              <ArrayPrimitiveList
                key={name}
                name={name}
                displayName={propName}
                itemSchema={kind.itemSchema}
                required={isRequired}
                control={control}
                errors={errors}
                disabled={disabled}
              />
            );

          case "array-object-table":
            return (
              <ArrayObjectTable
                key={name}
                name={name}
                displayName={propName}
                itemSchema={kind.itemSchema}
                control={control}
                errors={errors}
                disabled={disabled}
              />
            );

          case "raw-json":
            return (
              <RawJsonField
                key={name}
                name={name}
                displayName={propName}
                schema={propSchema}
                required={isRequired}
                control={control}
                errors={errors}
                disabled={disabled}
              />
            );
        }
      })}
    </>
  );
}
