"use client";

import { useState } from "react";
import { PanelLeftOpen, PanelLeftClose, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useModules } from "../hooks/useModules";
import { humanLabel } from "../utils/schemaFields";
import { useChat } from "@/features/chat/hooks/useChat";
import { ModifyExistingFlow } from "./ModifyExistingFlow";

/**
 * Left-side toggle panel listing every module under modules/ — a direct
 * directory listing (see backend GET /modules), not derived from
 * models/schema/*.schema.json, so it reflects every defined module even
 * if it doesn't have a chat-facing schema yet.
 *
 * Clicking a module reveals two actions:
 *  - "Create new" sends the same kind of free-text message WelcomeScreen's
 *    example chips send, through the normal LLM intent-classification path
 *    (so an unsupported module still gets a sensible clarification instead
 *    of silently doing nothing).
 *  - "Modify existing" skips the LLM entirely (see ModifyExistingFlow) —
 *    picks an environment + a real existing entry, then opens the same
 *    form pre-filled with that entry's current fields matched against
 *    today's schema.
 */
export function ResourcePanel() {
  const [open, setOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [modifyingModule, setModifyingModule] = useState<string | null>(null);
  const { data, isLoading, error } = useModules();
  const { sendMessage, isBusy } = useChat();

  function closeActions() {
    setActiveModule(null);
    setModifyingModule(null);
  }

  return (
    <div className={`flex h-dvh flex-col border-r bg-muted/30 transition-all ${open ? "w-72" : "w-12"}`}>
      <div className="flex items-center justify-between border-b p-2">
        {open && <span className="pl-1 text-sm font-medium">Available resources</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse panel" : "Expand panel"}
        >
          {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>
      </div>

      {open && (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}

            {error && (
              <p className="p-2 text-xs text-destructive">
                {error instanceof Error ? error.message : "Failed to load available resources."}
              </p>
            )}

            {data?.modules.map((moduleName) => (
              <div key={moduleName} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (activeModule === moduleName) {
                      closeActions();
                    } else {
                      setActiveModule(moduleName);
                      setModifyingModule(null);
                    }
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Boxes className="size-3.5 shrink-0" />
                  <span className="truncate">{humanLabel(moduleName)}</span>
                </button>

                {activeModule === moduleName && modifyingModule !== moduleName && (
                  <div className="flex gap-2 pl-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isBusy}
                      onClick={() => {
                        sendMessage(`I'd like to create a ${humanLabel(moduleName)}`);
                        closeActions();
                      }}
                    >
                      Create new
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setModifyingModule(moduleName)}
                    >
                      Modify existing
                    </Button>
                  </div>
                )}

                {modifyingModule === moduleName && (
                  <div className="pl-2">
                    <ModifyExistingFlow moduleName={moduleName} onDone={closeActions} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
