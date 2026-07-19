import { AlertCircle, HelpCircle } from "lucide-react";
import type { ChatMessage } from "../types";
import { MessageBubble, TextBubble } from "./MessageBubble";
import { ResourceFormMessage } from "./ResourceFormMessage";
import { PreviewMessage } from "./PreviewMessage";
import { PrResultCard } from "@/features/infra-request/components/PrResultCard";

export function MessageItem({ message }: { message: ChatMessage }) {
  switch (message.kind) {
    case "text":
      return <TextBubble role={message.role} text={message.text} />;
    case "clarification":
      return (
        <MessageBubble role="bot">
          <div className="flex items-start gap-2">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{message.question}</span>
          </div>
        </MessageBubble>
      );
    case "error":
      return (
        <MessageBubble role="bot" tone="error">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{message.message}</span>
          </div>
        </MessageBubble>
      );
    case "resource-form":
      return <ResourceFormMessage message={message} />;
    case "preview":
      return <PreviewMessage message={message} />;
    case "result":
      return (
        <div className="max-w-lg">
          <PrResultCard outcome={message.outcome} />
        </div>
      );
  }
}
