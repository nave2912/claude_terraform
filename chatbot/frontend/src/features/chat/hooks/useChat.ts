import { useCallback, useState } from "react";
import { useChatStore } from "../store/chat.store";
import { useSchemaInfo } from "@/features/infra-request/hooks/useSchemaInfo";
import { classifyResourceIntent } from "@/features/infra-request/services/intent.api";
import { infraRequestApi } from "@/features/infra-request/services/infraRequest.api";

const SCAFFOLD_COMMAND = /^\/tfmodules\b\s*(.*)$/i;

/**
 * Orchestrates the "which resource do you want?" step: sends the user's
 * free-text message to /api/intent (LLM, frontend-only), then appends
 * either a resource-form message (matched) or a clarification message
 * (ambiguous) to the chat log. Everything after this point — the actual
 * field values — comes from the schema form, not the LLM.
 *
 * A message starting with "/tfmodules" (or any follow-up message while a
 * scaffold clarification is pending, tracked via `scaffoldContext`) is
 * routed to the module-scaffolding flow instead — see
 * chatbot/backend/src/pipeline/scaffoldModulePlan.ts. This bypasses the
 * normal schema-registry-constrained intent classifier entirely, since
 * scaffolding is explicitly for resource types that AREN'T in the schema
 * registry yet.
 */
export function useChat() {
  const { messages, isBusy, addMessage, setBusy, reset } = useChatStore();
  const schemaInfoQuery = useSchemaInfo();
  // null = not mid-scaffold-conversation; "" or partial text = awaiting a
  // clarifying answer, accumulated so the next plan call has full context.
  const [scaffoldContext, setScaffoldContext] = useState<string | null>(null);

  const runScaffoldPlan = useCallback(
    async (description: string) => {
      setBusy(true);
      try {
        const outcome = await infraRequestApi.scaffoldModulePlan(description);

        if (outcome.status === "clarification_needed") {
          addMessage({ role: "bot", kind: "clarification", question: outcome.question });
          setScaffoldContext(description);
          return;
        }
        if (outcome.status === "no_action") {
          addMessage({ role: "bot", kind: "error", message: outcome.message });
          setScaffoldContext(null);
          return;
        }
        if (outcome.status === "denied") {
          addMessage({ role: "bot", kind: "error", message: `${outcome.resourceType}: ${outcome.reason}` });
          setScaffoldContext(null);
          return;
        }
        if (outcome.status === "unknown_resource_type") {
          addMessage({
            role: "bot",
            kind: "error",
            message: `"${outcome.resourceType}" isn't a known azurerm resource type. Try naming it more precisely (e.g. "azurerm_linux_virtual_machine").`,
          });
          setScaffoldContext(null);
          return;
        }

        addMessage({ role: "bot", kind: "scaffold-plan", plan: outcome });
        setScaffoldContext(null);
      } catch (err) {
        addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
        setScaffoldContext(null);
      } finally {
        setBusy(false);
      }
    },
    [addMessage]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      addMessage({ role: "user", kind: "text", text });

      const trimmed = text.trim();
      const scaffoldMatch = trimmed.match(SCAFFOLD_COMMAND);

      if (scaffoldMatch || scaffoldContext !== null) {
        const description = scaffoldMatch
          ? scaffoldMatch[1].trim()
          : `${scaffoldContext} ${trimmed}`.trim();

        if (!description) {
          addMessage({
            role: "bot",
            kind: "clarification",
            question: 'What Azure resource would you like to scaffold a new module for? (e.g. "a Linux virtual machine")',
          });
          setScaffoldContext("");
          return;
        }

        await runScaffoldPlan(description);
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
    [addMessage, schemaInfoQuery.data, setBusy, scaffoldContext, runScaffoldPlan]
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
