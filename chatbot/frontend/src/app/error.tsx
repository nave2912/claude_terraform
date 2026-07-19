"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{error.message || "Something went wrong."}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
