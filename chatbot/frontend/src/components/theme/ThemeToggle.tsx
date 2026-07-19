"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme.store";

const ORDER = ["light", "dark", "system"] as const;
const ICON = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const Icon = ICON[theme];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length])}
      aria-label={`Theme: ${theme}. Click to change.`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
