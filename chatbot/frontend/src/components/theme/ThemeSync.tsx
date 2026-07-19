"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme.store";

/** Applies the persisted theme choice to <html class="dark">, including
 * following the OS setting live when theme === "system". */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mql.matches);
      const listener = (e: MediaQueryListEvent) => apply(e.matches);
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    }
    apply(theme === "dark");
  }, [theme]);

  return null;
}
