"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1];
  const text = String(children).replace(/\n$/, "");

  const onCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-border bg-background/60">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-1.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-subtle">
          {lang || "text"}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] text-subtle transition-colors hover:bg-surface hover:text-foreground"
        >
          {copied ? <Check className="size-3 text-allow" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5">
        <code className="font-mono text-[0.8rem] leading-relaxed text-foreground/90">{text}</code>
      </pre>
    </div>
  );
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("chat-markdown text-[0.925rem] leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary-bright underline underline-offset-2 hover:opacity-80">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 text-muted-foreground last:mb-0">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-lg border border-border last:mb-0">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-border bg-surface/50">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-medium text-foreground">{children}</th>,
          td: ({ children }) => <td className="border-t border-border/60 px-3 py-2 text-muted-foreground">{children}</td>,
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className || "");
            if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
            return (
              <code
                className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-primary-bright"
                {...props}
              >
                {children}
              </code>
            );
          },
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
