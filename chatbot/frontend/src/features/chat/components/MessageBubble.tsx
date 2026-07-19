import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { ChatRole } from "../types";

export function MessageBubble({
  role,
  children,
  tone = "default",
}: {
  role: ChatRole;
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isUser
          ? "self-end rounded-br-sm bg-primary text-primary-foreground"
          : "self-start rounded-bl-sm bg-muted",
        tone === "error" && "border border-destructive/40 bg-destructive/10 text-destructive"
      )}
    >
      {children}
    </div>
  );
}

export function TextBubble({ role, text }: { role: ChatRole; text: string }) {
  return (
    <MessageBubble role={role}>
      {role === "bot" ? <MarkdownRenderer content={text} /> : text}
    </MessageBubble>
  );
}
