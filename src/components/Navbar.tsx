import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#0a0a0f]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="rounded-lg bg-violet-600 p-1.5 transition-colors group-hover:bg-violet-500">
              <BookOpenText className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              DocNest
            </span>
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
