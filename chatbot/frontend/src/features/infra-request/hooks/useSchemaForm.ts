import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ResourceTypeInfo } from "@/types/schema";
import { buildZodSchema } from "../utils/buildZodSchema";
import { buildDefaultValue } from "../utils/schemaTree";

export function useSchemaForm(resourceType: ResourceTypeInfo, defaultEnvironment?: string) {
  const entrySchema = resourceType.schema.properties[resourceType.containerKey].additionalProperties;
  const zodSchema = useMemo(() => buildZodSchema(entrySchema), [entrySchema]);

  const defaultValues = useMemo(
    () => buildDefaultValue(entrySchema, { defaultEnvironment }) as Record<string, unknown>,
    [entrySchema, defaultEnvironment]
  );

  const form = useForm<Record<string, unknown>>({
    // The zod schema's exact shape is built dynamically from JSON Schema at
    // runtime (see buildZodSchema) — there's no way to express that as a
    // static TS type that lines up with zodResolver's generic, so this
    // boundary is deliberately untyped rather than fought with `as never`
    // casts scattered through the rest of the form.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(zodSchema as any),
    defaultValues,
  });

  return { form, entrySchema };
}
