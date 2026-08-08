import { useCallback, useState } from "react";
import { useChatStore } from "../store/chat.store";
import { useSchemaInfo } from "@/features/infra-request/hooks/useSchemaInfo";
import { classifyResourceIntent } from "@/features/infra-request/services/intent.api";
import { infraRequestApi } from "@/features/infra-request/services/infraRequest.api";

const TERRAFORM_COMMAND = /^\/terraform\b\s*(.*)$/i;
const SCAFFOLD_COMMAND = /^\/tfmodules\b\s*(.*)$/i;

/**
 * Orchestrates the "which resource do you want?" step: sends the user's
 * free-text message to /api/intent (LLM, frontend-only), then appends
 * either a resource-form message (matched) or a clarification message
 * (ambiguous) to the chat log. Everything after this point — the actual
 * field values — comes from the schema form, not the LLM.
 *
 * A message starting with "/terraform" is the single recommended entry
 * point: it asks the backend's /terraform-route (see
 * chatbot/backend/src/pipeline/routeTerraformCommand.ts) whether the
 * requested resource type already has a module — if so it opens the same
 * resource-form flow plain chat uses below (create an instance from the
 * JSON model, via the schema-driven UI). If not, it imports the module —
 * no field review, no example values, no plan step: /terraform's whole job
 * here is onboarding the module itself (files + schema + environment
 * wiring, zero instances). Creating an actual instance afterward always
 * goes through the resource-form/JSON-model flow, never through
 * /terraform — see runScaffoldImport.
 *
 * A message starting with "/tfmodules" (or a follow-up while a /terraform
 * clarification is pending) is a deprecated alias — shown a notice, then
 * handled by the exact same runTerraformRoute path as /terraform.
 */
export function useChat() {
  const { messages, isBusy, addMessage, setBusy, reset } = useChatStore();
  const schemaInfoQuery = useSchemaInfo();
  // null = not mid-/terraform-conversation; "" or partial text = awaiting a
  // clarifying answer, accumulated so the next route call has full context.
  const [terraformContext, setTerraformContext] = useState<string | null>(null);

  const runScaffoldImport = useCallback(
    async (providerResourceType: string) => {
      setBusy(true);
      try {
        // No environment picker, no field review — importing a module
        // creates zero instances, so there's nothing instance-shaped to
        // ask the user about. Silently targets the first configured
        // environment (today, always "dev").
        const environment = schemaInfoQuery.data?.allowedEnvironments[0] ?? "dev";
        const outcome = await infraRequestApi.scaffoldModuleGenerate(providerResourceType, environment);

        if (
          outcome.status === "denied" ||
          outcome.status === "unknown_resource_type" ||
          outcome.status === "environment_blocked" ||
          outcome.status === "schema_generation_failed"
        ) {
          const message =
            outcome.status === "denied"
              ? `${outcome.resourceType}: ${outcome.reason}`
              : outcome.status === "unknown_resource_type"
                ? `"${outcome.resourceType}" isn't a known azurerm resource type. Try naming it more precisely (e.g. "azurerm_linux_virtual_machine").`
                : outcome.status === "environment_blocked"
                  ? `"${outcome.environment}" isn't an allowed environment (allowed: ${outcome.allowed.join(", ")}).`
                  : outcome.errors.join(", ");
          addMessage({ role: "bot", kind: "error", message });
          return;
        }

        addMessage({ role: "bot", kind: "scaffold-result", outcome });
      } catch (err) {
        addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        setBusy(false);
      }
    },
    [addMessage, schemaInfoQuery.data, setBusy]
  );

  const runTerraformRoute = useCallback(
    async (description: string) => {
      setBusy(true);
      try {
        const outcome = await infraRequestApi.terraformRoute(description);

        if (outcome.status === "clarification_needed") {
          addMessage({ role: "bot", kind: "clarification", question: outcome.question });
          setTerraformContext(description);
          return;
        }
        if (outcome.status === "no_action") {
          addMessage({ role: "bot", kind: "error", message: outcome.message });
          setTerraformContext(null);
          return;
        }

        setTerraformContext(null);

        if (outcome.status === "existing_type") {
          const def = schemaInfoQuery.data?.resourceTypes.find((r) => r.resourceType === outcome.resourceType);
          if (!def) {
            addMessage({ role: "bot", kind: "error", message: `Unknown resource type "${outcome.resourceType}".` });
            return;
          }
          addMessage({ role: "bot", kind: "resource-form", resourceType: def });
          return;
        }

        // new_type: hand the already-resolved provider resource type
        // straight to the import step — no second LLM call to re-resolve
        // it, no field review. runScaffoldImport manages its own busy state.
        setBusy(false);
        await runScaffoldImport(outcome.providerResourceType);
        return;
      } catch (err) {
        addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
        setTerraformContext(null);
      } finally {
        setBusy(false);
      }
    },
    [addMessage, schemaInfoQuery.data, runScaffoldImport, setBusy]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      addMessage({ role: "user", kind: "text", text });

      const trimmed = text.trim();

      const terraformMatch = trimmed.match(TERRAFORM_COMMAND);
      const scaffoldMatch = trimmed.match(SCAFFOLD_COMMAND);

      if (terraformMatch || scaffoldMatch || terraformContext !== null) {
        if (scaffoldMatch) {
          addMessage({
            role: "bot",
            kind: "text",
            text: "`/tfmodules` is deprecated — use `/terraform <request>` instead. Continuing…",
          });
        }

        const match = terraformMatch ?? scaffoldMatch;
        const description = match ? match[1].trim() : `${terraformContext} ${trimmed}`.trim();

        if (!description) {
          addMessage({
            role: "bot",
            kind: "clarification",
            question: 'What Azure resource would you like to create? (e.g. "a resource group" or "a Linux virtual machine")',
          });
          setTerraformContext("");
          return;
        }

        await runTerraformRoute(description);
        return;
      }

      const schemaInfo = schemaInfoQuery.data;
      if (!schemaInfo) {
        addMessage({
          role: "bot",
          kind: "error",
          message: "Still loading available resource types — try again in a moment.",
        });
        return;
      }

      setBusy(true);
      try {
        const result = await classifyResourceIntent(
          text,
          schemaInfo.resourceTypes.map((r) => ({
            resourceType: r.resourceType,
            description: r.schema.description ?? r.schema.title ?? r.resourceType,
          })),
          schemaInfo.allowedEnvironments
        );

        if (result.kind === "matched" && result.resourceType) {
          const def = schemaInfo.resourceTypes.find((r) => r.resourceType === result.resourceType);
          if (!def) {
            addMessage({ role: "bot", kind: "error", message: `Unknown resource type "${result.resourceType}".` });
            return;
          }
          addMessage({ role: "bot", kind: "resource-form", resourceType: def, environment: result.environment });
        } else {
          addMessage({
            role: "bot",
            kind: "clarification",
            question: result.question ?? "Could you clarify which resource you'd like to create?",
          });
        }
      } catch (err) {
        addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        setBusy(false);
      }
    },
    [addMessage, schemaInfoQuery.data, setBusy, terraformContext, runTerraformRoute]
  );

  return {
    messages,
    isBusy,
    sendMessage,
    reset,
    schemaInfo: schemaInfoQuery.data,
    schemaInfoLoading: schemaInfoQuery.isLoading,
    schemaInfoError: schemaInfoQuery.error,
  };
}
