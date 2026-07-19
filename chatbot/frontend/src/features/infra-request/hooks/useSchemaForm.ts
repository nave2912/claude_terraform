import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ResourceTypeInfo } from "@/types/schema";
import { buildZodSchema } from "../utils/buildZodSchema";
import { flattenSchemaFields, fieldKey } from "../utils/schemaFields";

export function useSchemaForm(resourceType: ResourceTypeInfo, defaultEnvironment?: string) {
  const entrySchema = resourceType.schema.properties[resourceType.containerKey].additionalProperties;
  const fields = useMemo(() => flattenSchemaFields(entrySchema), [entrySchema]);
  const zodSchema = useMemo(() => buildZodSchema(fields), [fields]);

  const defaultValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const field of fields) {
      const key = fieldKey(field.path);
      if (field.path[field.path.length - 1] === "environment" && defaultEnvironment) {
        values[key] = defaultEnvironment;
      } else if (field.schema.default) {
        values[key] = field.schema.default;
      } else {
        values[key] = "";
      }
    }
    return values;
  }, [fields, defaultEnvironment]);

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(zodSchema) as never,
    defaultValues,
  });

  return { form, fields, entrySchema };
}
