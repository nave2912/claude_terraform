"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useThemeStore } from "@/store/theme.store";
import { CopyButton } from "./CopyButton";

export function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="group relative overflow-hidden rounded-lg border">
      <div className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={code} />
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{ margin: 0, fontSize: "0.8rem", padding: "0.85rem" }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
