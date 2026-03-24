import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { DocMeta } from "@/lib/docs";

const CATEGORY_STYLES: Record<string, { badge: string; dot: string }> = {
  Guide: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Reference: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  JavaScript: {
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  React: {
    badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  CSS: {
    badge: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    dot: "bg-pink-500",
  },
  Git: {
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  General: {
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
};

const DEFAULT_STYLE = CATEGORY_STYLES.General;

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function DocCard({ doc }: { doc: DocMeta }) {
  const style = CATEGORY_STYLES[doc.category] ?? DEFAULT_STYLE;

  return (
    <Link href={`/docs/${doc.slug}`} className="group block h-full">
      <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-violet-700/60 dark:hover:bg-zinc-900">
        {/* Category */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {doc.category}
          </span>
        </div>

        {/* Title */}
        <h2 className="mb-2 line-clamp-2 text-lg font-semibold leading-snug transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400">
          {doc.title}
        </h2>

        {/* Description */}
        {doc.description && (
          <p className="mb-4 line-clamp-3 flex-1 text-sm text-zinc-500 dark:text-zinc-400">
            {doc.description}
          </p>
        )}

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {doc.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            {doc.date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(doc.date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {doc.readTime} min read
            </span>
          </div>

          <ArrowRight className="h-4 w-4 -translate-x-1 text-violet-500 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </article>
    </Link>
  );
}
