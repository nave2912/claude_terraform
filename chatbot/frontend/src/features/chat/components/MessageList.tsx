"use client";

import { useChat } from "../hooks/useChat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { MessageItem } from "./MessageItem";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";
import { ScrollButton } from "./ScrollButton";
import { Skeleton } from "@/components/ui/skeleton";

export function MessageList() {
  const { messages, isBusy, sendMessage, schemaInfoLoading, schemaInfoError } = useChat();
  const { containerRef, isAtBottom, handleScroll, scrollToBottom } = useAutoScroll(
    `${messages.length}-${isBusy}`
  );

  if (schemaInfoError) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
        Couldn&apos;t reach the backend. Confirm BACKEND_BASE_URL / BACKEND_API_KEY in .env.local and that
        the chatbot backend (`npm run serve`) is running.
      </div>
    );
  }

  if (schemaInfoLoading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-10 w-1/3" />
        <Skeleton className="h-24 w-3/4" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={containerRef} onScroll={handleScroll} className="flex h-full flex-col gap-3 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <WelcomeScreen onExample={sendMessage} />
        ) : (
          messages.map((message) => <MessageItem key={message.id} message={message} />)
        )}
        {isBusy && <TypingIndicator />}
      </div>
      <ScrollButton visible={!isAtBottom} onClick={scrollToBottom} />
    </div>
  );
}
