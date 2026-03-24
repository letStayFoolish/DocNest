"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { MarkdownContent } from "./MarkdownContent";
import { TableOfContents } from "./TableOfContents";
import type { Doc, Heading } from "@/lib/docs";

const CATEGORY_TEXT: Record<string, string> = {
  Guide: "text-emerald-500",
  Reference: "text-blue-500",
  JavaScript: "text-yellow-500",
  React: "text-cyan-500",
  CSS: "text-pink-500",
  Git: "text-orange-500",
  General: "text-violet-500",
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function DocPageContent({
  doc,
  headings,
}: {
  doc: Doc;
  headings: Heading[];
}) {
  const categoryColor = CATEGORY_TEXT[doc.category] ?? CATEGORY_TEXT.General;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all docs
        </Link>
      </motion.div>

      <div className="flex gap-16">
        {/* Main content */}
        <motion.article
          className="min-w-0 flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Doc header */}
          <header className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <span className={`text-sm font-semibold ${categoryColor}`}>
              {doc.category}
            </span>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {doc.title}
            </h1>

            {doc.description && (
              <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
                {doc.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              {doc.date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(doc.date)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {doc.readTime} min read
              </span>
            </div>

            {doc.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Markdown body */}
          <MarkdownContent content={doc.content} />
        </motion.article>

        {/* TOC sidebar */}
        {headings.length > 0 && (
          <aside className="hidden w-56 shrink-0 xl:block">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
  );
}
