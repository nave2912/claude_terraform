"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ProposalPreview } from "@/features/infra-request/components/ProposalPreview";
import { infraRequestApi } from "@/features/infra-request/services/infraRequest.api";
import { useChatStore } from "../store/chat.store";
import type { ChatMessage } from "../types";

export function PreviewMessage({ message }: { message: Extract<ChatMessage, { kind: "preview" }> }) {
  const [resolved, setResolved] = useState(false);
  const { addMessage } = useChatStore();

  const proposeMutation = useMutation({
    mutationFn: infraRequestApi.propose,
    onSuccess: (outcome) => {
      setResolved(true);
      addMessage({ role: "bot", kind: "result", outcome });
    },
    onError: (err) => {
      addMessage({ role: "bot", kind: "error", message: err instanceof Error ? err.message : String(err) });
    },
  });

  return (
    <div className="max-w-lg data-[resolved=true]:pointer-events-none data-[resolved=true]:opacity-60" data-resolved={resolved}>
      <ProposalPreview
        outcome={message.outcome}
        input={message.input}
        submitting={proposeMutation.isPending}
        onConfirm={() => proposeMutation.mutate(message.input)}
        onCancel={() => {
          setResolved(true);
          addMessage({ role: "bot", kind: "text", text: "Cancelled — nothing was written or pushed." });
        }}
      />
    </div>
  );
}
