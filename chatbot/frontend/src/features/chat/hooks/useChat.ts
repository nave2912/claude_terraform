import { useCallback } from "react";
import { useChatStore } from "../store/chat.store";
import { useSchemaInfo } from "@/features/infra-request/hooks/useSchemaInfo";
import { classifyResourceIntent } from "@/features/infra-request/services/intent.api";

/**
 * Orchestrates the "which resource do you want?" step: sends the user's
 * free-text message to /api/intent (LLM, frontend-only), then appends
 * either a resource-form message (matched) or a clarification message
 * (ambiguous) to the chat log. Everything after this point — the actual
 * field values — comes from the schema form, not the LLM.
 */
export function useChat() {
  const { messages, isBusy, addMessage, setBusy, reset } = useChatStore();
  const schemaInfoQuery = useSchemaInfo();

  const sendMessage = useCallback(
    async (text: string) => {
      addMessage({ role: "user", kind: "text", text });

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
    [addMessage, schemaInfoQuery.data, setBusy]
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
