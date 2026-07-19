"use client";

import { Boxes, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useChatStore } from "../store/chat.store";

export function ChatHeader() {
  const reset = useChatStore((s) => s.reset);

  return (
    <header className="flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Boxes className="size-5 text-primary" />
        <div>
          <h1 className="text-sm font-semibold leading-none">Landing Zone Assistant</h1>
          <p className="text-xs text-muted-foreground">Terraform · DevOps</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={reset} aria-label="New chat">
          <RotateCcw className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
