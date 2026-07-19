import { create } from "zustand";
import type { ChatMessage, ChatMessageInput } from "../types";

interface ChatState {
  messages: ChatMessage[];
  isBusy: boolean;
  addMessage: (message: ChatMessageInput) => void;
  setBusy: (busy: boolean) => void;
  reset: () => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `msg-${Date.now()}-${counter}`;
}

/**
 * In-memory only, one conversation, no persistence — intentional scope for
 * this build increment (see chatbot/frontend/README.md "Not yet built").
 * A conversation/history feature can wrap this store with persistence
 * later without changing any component here.
 */
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isBusy: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, { ...message, id: nextId() } as ChatMessage] })),
  setBusy: (busy) => set({ isBusy: busy }),
  reset: () => set({ messages: [], isBusy: false }),
}));
