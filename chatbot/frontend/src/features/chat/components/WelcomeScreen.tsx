import { Boxes } from "lucide-react";

const EXAMPLES = [
  "I'd like to create a storage account",
  "Create a new resource group for the analytics team",
  "Set up a storage account for the platform team",
];

export function WelcomeScreen({ onExample }: { onExample: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Boxes className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Terraform Landing Zone Assistant</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Tell me which Azure resource you need. I&apos;ll match it to a defined module, walk you through
          its exact required fields, and open a pull request — a human always reviews it before anything
          reaches Azure.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onExample(ex)}
            className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
