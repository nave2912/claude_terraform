"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className ?? "");
            const isBlock = Boolean(match);
            if (!isBlock) {
              return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
            }
            return <CodeBlock code={String(children).replace(/\n$/, "")} language={match?.[1]} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
