"use client";

import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "@/features/chat-input/components/ChatInput";
import { useChat } from "../hooks/useChat";

export function ChatWindow() {
  const { sendMessage, isBusy } = useChat();

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader />
      <MessageList />
      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <ChatInput onSend={sendMessage} disabled={isBusy} />
        </div>
      </div>
    </div>
  );
}
