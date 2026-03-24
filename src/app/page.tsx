import { getAllDocs } from "@/lib/docs";
import { DocList } from "@/components/DocList";
import { FileText, FolderOpen } from "lucide-react";

export default function HomePage() {
  const docs = getAllDocs();
  const categories = [...new Set(docs.map((d) => d.category))];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <section className="relative py-20 text-center overflow-hidden">
        {/* Dot background */}
        <div className="hero-dots absolute inset-0 opacity-60" />
        {/* Gradient blob */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            Personal Documentation Library
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            My{" "}
            <span className="gradient-text">Doc</span>
            <span className="gradient-text">Nest</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-8">
            All my notes and documentation in one searchable place. Clean,
            organized, always accessible.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <FileText className="h-4 w-4 text-violet-500" />
              <span>
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {docs.length}
                </strong>{" "}
                documents
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <FolderOpen className="h-4 w-4 text-violet-500" />
              <span>
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {categories.length}
                </strong>{" "}
                categories
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Doc list with search + filter */}
      <DocList docs={docs} categories={categories} />
    </div>
  );
}
