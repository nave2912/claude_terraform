"use client";

import { useRef, useState } from "react";
import { Paperclip, Mic, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_LENGTH = 2000;

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(autoGrow);
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Attach file (coming soon)">
              <Paperclip className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Attachments — coming soon</TooltipContent>
      </Tooltip>

      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        maxLength={MAX_LENGTH}
        rows={1}
        placeholder="Which resource do you need to create?"
        className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Voice input (coming soon)">
              <Mic className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Voice input — coming soon</TooltipContent>
      </Tooltip>

      <Button type="button" size="icon" onClick={submit} disabled={disabled || !value.trim()} aria-label="Send message">
        <SendHorizontal className="size-4" />
      </Button>
    </div>
  );
}
