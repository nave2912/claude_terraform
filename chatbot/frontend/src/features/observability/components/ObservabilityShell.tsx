"use client";

import Link from "next/link";
import { Activity, ArrowLeft, DollarSign, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostPanel } from "./CostPanel";
import { MetricsPanel } from "./MetricsPanel";

export function ObservabilityShell() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Back to home"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Activity className="size-5 text-primary" />
          <div>
            <h1 className="text-sm font-semibold leading-none">Observability</h1>
            <p className="text-xs text-muted-foreground">Cost · Metrics · AI usage</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Tabs defaultValue="cost" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-4 pt-3 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <TabsList>
              <TabsTrigger value="cost">
                <DollarSign className="size-4" />
                Cost
              </TabsTrigger>
              <TabsTrigger value="metrics">
                <Activity className="size-4" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="ai-usage">
                <Sparkles className="size-4" />
                AI usage
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <TabsContent value="cost">
              <CostPanel />
            </TabsContent>
            <TabsContent value="metrics">
              <MetricsPanel />
            </TabsContent>
            <TabsContent value="ai-usage">
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-6" />
                </div>
                <h2 className="text-lg font-semibold">Nothing here yet</h2>
                <p className="max-w-sm text-sm text-muted-foreground">AI cost tracking is coming soon.</p>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
