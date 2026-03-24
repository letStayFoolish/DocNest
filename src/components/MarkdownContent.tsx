"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute right-3 top-3 z-10 rounded-md bg-zinc-700/60 p-1.5 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-600/60 hover:text-zinc-200"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      className="
        prose prose-zinc dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-violet-600 dark:prose-code:text-violet-400
        prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800/80
        prose-code:rounded prose-code:px-1.5 prose-code:py-0.5
        prose-code:text-[0.85em] prose-code:font-normal
        prose-code:before:content-none prose-code:after:content-none
        prose-pre:p-0 prose-pre:bg-transparent prose-pre:shadow-none
        prose-blockquote:border-violet-500 prose-blockquote:bg-violet-500/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1
        prose-img:rounded-xl
        prose-table:text-sm
        prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800
        prose-hr:border-zinc-200 dark:prose-hr:border-zinc-800
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeStr = String(children).replace(/\n$/, "");

            if (match) {
              const lang = match[1];
              const style = mounted
                ? resolvedTheme === "dark"
                  ? oneDark
                  : oneLight
                : oneDark;

              return (
                <div className="relative group not-prose my-6 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700/50">
                  {/* Language tag */}
                  <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700/50">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {lang}
                    </span>
                    <CopyButton code={codeStr} />
                  </div>
                  <SyntaxHighlighter
                    language={lang}
                    style={style}
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: "0.875rem",
                      background: resolvedTheme === "dark" ? "#18181b" : "#fafafa",
                    }}
                    showLineNumbers={codeStr.split("\n").length > 8}
                    lineNumberStyle={{ color: "#52525b", fontSize: "0.75rem" }}
                  >
                    {codeStr}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Inline code
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
