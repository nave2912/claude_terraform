import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;
  return (
    <Button
      size="icon"
      variant="secondary"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md"
      onClick={onClick}
      aria-label="Scroll to latest message"
    >
      <ArrowDown className="size-4" />
    </Button>
  );
}
