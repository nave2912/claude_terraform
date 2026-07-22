"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKeyVaults } from "../hooks/useKeyVaults";
import { useVaultSecrets } from "../hooks/useVaultSecrets";
import { keyvaultRequestApi } from "../services/keyvaultRequest.api";
import { SecretValueInput } from "./SecretValueInput";

const SECRET_NAME_PATTERN = /^[0-9a-zA-Z-]{1,127}$/;
const ADD_NEW_VALUE = "__add_new__";

/**
 * The /keyvault chat panel: resource group + vault picker, then a secret
 * name picker (existing names, or "Add new secret"), then a masked value
 * input. Submitting writes straight to the real Azure Key Vault via
 * chatbot/backend's /keyvault/:vaultName/secrets — there is no PR/branch
 * here, so this panel shows a plain inline success/error state instead of
 * the PrResultCard flow the rest of the chat uses.
 *
 * The current value of an existing secret is never fetched or shown —
 * updating always starts from an empty value field, by design.
 */
export function KeyVaultPanel() {
  const vaultsQuery = useKeyVaults();
  const [vaultName, setVaultName] = useState<string>("");
  const [selectedSecret, setSelectedSecret] = useState<string>("");
  const [newSecretName, setNewSecretName] = useState("");
  const [value, setValue] = useState("");

  const secretsQuery = useVaultSecrets(vaultName || null);
  const secretNames = secretsQuery.data?.names ?? [];

  const isAddMode = selectedSecret === ADD_NEW_VALUE;
  const effectiveName = isAddMode ? newSecretName : selectedSecret;
  const nameValid = SECRET_NAME_PATTERN.test(effectiveName);

  const setSecretMutation = useMutation({
    mutationFn: () => keyvaultRequestApi.setSecret(vaultName, effectiveName, value),
    onSuccess: () => {
      setValue("");
      if (isAddMode) {
        setNewSecretName("");
        secretsQuery.refetch();
      }
    },
  });

  const vaults = vaultsQuery.data?.vaults ?? [];
  const selectedVault = useMemo(() => vaults.find((v) => v.name === vaultName), [vaults, vaultName]);

  if (vaultsQuery.isLoading) {
    return <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading key vaults…</p>;
  }

  if (vaultsQuery.isError) {
    return (
      <Card className="max-w-lg border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Couldn&apos;t load key vaults</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">
          {vaultsQuery.error instanceof Error ? vaultsQuery.error.message : String(vaultsQuery.error)}
        </CardContent>
      </Card>
    );
  }

  if (vaults.length === 0) {
    return (
      <p className="rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground">
        No key vaults found for the allowed environments.
      </p>
    );
  }

  return (
    <Card className="max-w-lg overflow-visible border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="size-4" /> Manage a Key Vault secret
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Resource group / Key Vault</span>
          <Select
            value={vaultName}
            onValueChange={(v) => {
              if (!v) return;
              setVaultName(v);
              setSelectedSecret("");
              setNewSecretName("");
              setValue("");
              setSecretMutation.reset();
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Select a key vault">
                {(v: string | null) => {
                  const vault = vaults.find((x) => x.name === v);
                  return vault ? `${vault.resourceGroup} / ${vault.name} (${vault.environment})` : "Select a key vault";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {vaults.map((v) => (
                <SelectItem key={v.name} value={v.name}>
                  {v.resourceGroup} / {v.name} ({v.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {vaultName && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Secret</span>
            {secretsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading existing secrets…</p>
            ) : (
              <Select
                value={selectedSecret}
                onValueChange={(v) => {
                  if (!v) return;
                  setSelectedSecret(v);
                  setValue("");
                  setSecretMutation.reset();
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Select a secret to update, or add a new one">
                    {(v: string | null) => (v === ADD_NEW_VALUE ? "+ Add new secret" : v || "Select a secret to update, or add a new one")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_NEW_VALUE}>+ Add new secret</SelectItem>
                  {secretNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {selectedSecret && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Secret name</span>
              {isAddMode ? (
                <Input
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                  placeholder="my-secret-name"
                  aria-invalid={newSecretName.length > 0 && !nameValid}
                />
              ) : (
                <Input value={selectedSecret} disabled />
              )}
              {isAddMode && newSecretName.length > 0 && !nameValid && (
                <span className="text-xs text-destructive">
                  Letters, numbers, and hyphens only (1-127 chars).
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {isAddMode ? "Value" : "New value (current value is never shown)"}
              </span>
              <SecretValueInput value={value} onChange={setValue} placeholder="Paste or type the secret value" />
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="w-fit"
              disabled={!nameValid || !value || setSecretMutation.isPending}
              onClick={() => setSecretMutation.mutate()}
            >
              {setSecretMutation.isPending ? "Saving…" : isAddMode ? "Add secret" : "Update secret"}
            </Button>

            {setSecretMutation.isSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Secret &quot;{setSecretMutation.data.name}&quot; saved to{" "}
                {selectedVault?.name}.
              </p>
            )}
            {setSecretMutation.isError && (
              <p className="text-xs text-destructive">
                {setSecretMutation.error instanceof Error
                  ? setSecretMutation.error.message
                  : String(setSecretMutation.error)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
