"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/docs";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        On this page
      </p>
      <nav className="space-y-0.5">
        {headings.map(({ id, text, level }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`block truncate rounded py-1 text-sm transition-colors ${
              level === 1 ? "pl-0" : level === 2 ? "pl-0" : "pl-3"
            } ${
              activeId === id
                ? "font-medium text-violet-600 dark:text-violet-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            title={text}
          >
            {text}
          </a>
        ))}
      </nav>
    </div>
  );
}
