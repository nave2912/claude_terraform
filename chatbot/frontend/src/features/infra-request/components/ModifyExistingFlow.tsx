"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useModelEntries } from "../hooks/useModelEntries";
import { useSchemaInfo } from "../hooks/useSchemaInfo";
import { useChatStore } from "@/features/chat/store/chat.store";

interface Props {
  /** Raw modules/ folder name, e.g. "storage_account". */
  moduleName: string;
  onDone: () => void;
}

/**
 * Environment -> existing entry picker, then hands the selected entry's
 * real fields to a resource-form chat message in "modify" mode (see
 * DynamicResourceForm's editingKey/initialValues). Module folder names use
 * underscores; schema resourceType strings use hyphens (e.g.
 * storage_account -> storage-account) -- that's the only translation
 * needed since both are otherwise the same identifier.
 */
export function ModifyExistingFlow({ moduleName, onDone }: Props) {
  const schemaInfoQuery = useSchemaInfo();
  const allowedEnvironments = schemaInfoQuery.data?.allowedEnvironments ?? ["dev"];
  const [environment, setEnvironment] = useState(allowedEnvironments[0]);
  const [selectedKey, setSelectedKey] = useState("");

  const resourceType = moduleName.replace(/_/g, "-");
  const resourceTypeInfo = schemaInfoQuery.data?.resourceTypes.find((r) => r.resourceType === resourceType);

  const { data, isLoading } = useModelEntries(resourceTypeInfo ? resourceType : null, environment);
  const entries = data?.entries ?? {};
  const keys = Object.keys(entries);

  const { addMessage } = useChatStore();

  if (schemaInfoQuery.isLoading) {
    return <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>;
  }

  if (!resourceTypeInfo) {
    return (
      <p className="rounded-md border bg-background px-2 py-1.5 text-xs text-destructive">
        No chat-facing schema for this module yet — it can&apos;t be created or modified here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-2">
      <Select
        value={environment}
        onValueChange={(v) => {
          if (v) {
            setEnvironment(v);
            setSelectedKey("");
          }
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowedEnvironments.map((env) => (
            <SelectItem key={env} value={env}>
              {env}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <p className="text-xs text-muted-foreground">Loading existing entries…</p>}
      {!isLoading && keys.length === 0 && (
        <p className="text-xs text-muted-foreground">No existing entries in {environment} yet.</p>
      )}
      {keys.length > 0 && (
        <Select value={selectedKey} onValueChange={(v) => { if (v) setSelectedKey(v); }}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select existing entry" />
          </SelectTrigger>
          <SelectContent>
            {keys.map((key) => {
              const name = (entries[key] as { name?: string })?.name;
              return (
                <SelectItem key={key} value={key}>
                  {name ? `${key} (${name})` : key}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      <Button
        type="button"
        size="sm"
        disabled={!selectedKey}
        onClick={() => {
          addMessage({
            role: "bot",
            kind: "resource-form",
            resourceType: resourceTypeInfo,
            environment,
            editingKey: selectedKey,
            initialValues: entries[selectedKey],
          });
          onDone();
        }}
      >
        Load for editing
      </Button>
    </div>
  );
}
