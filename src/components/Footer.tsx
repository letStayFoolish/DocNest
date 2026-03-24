export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
          Built by{" "}
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            Nemanja Karaklajic
          </span>{" "}
          · {year}
        </p>
      </div>
    </footer>
  );
}
