"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DynamicResourceForm } from "@/features/infra-request/components/DynamicResourceForm";
import { infraRequestApi } from "@/features/infra-request/services/infraRequest.api";
import { useSchemaInfo } from "@/features/infra-request/hooks/useSchemaInfo";
import { useChatStore } from "../store/chat.store";
import type { ChatMessage } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

export function ResourceFormMessage({ message }: { message: Extract<ChatMessage, { kind: "resource-form" }> }) {
  const [submitted, setSubmitted] = useState(false);
  const { addMessage } = useChatStore();
  const schemaInfoQuery = useSchemaInfo();

  const previewMutation = useMutation({
    mutationFn: infraRequestApi.preview,
    onSuccess: (outcome, input) => {
      setSubmitted(true);
      addMessage({ role: "bot", kind: "preview", outcome, input });
    },
    onError: (err) => {
      addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
    },
  });

  if (!schemaInfoQuery.data) {
    return <Skeleton className="h-64 w-full max-w-lg" />;
  }

  return (
    <div className="max-w-lg opacity-100 data-[submitted=true]:pointer-events-none data-[submitted=true]:opacity-60" data-submitted={submitted}>
      <DynamicResourceForm
        resourceType={message.resourceType}
        allowedEnvironments={schemaInfoQuery.data.allowedEnvironments}
        defaultEnvironment={message.environment}
        editingKey={message.editingKey}
        initialValues={message.initialValues}
        submitting={previewMutation.isPending || submitted}
        onSubmit={(input) => previewMutation.mutate(input)}
      />
    </div>
  );
}
