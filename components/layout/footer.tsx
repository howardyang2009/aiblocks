import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto max-w-shell px-5 py-10 flex flex-col sm:flex-row gap-4 justify-between text-sm text-muted">
        <p className="font-mono text-xs">AiBlocks — npm for AI components</p>
        <nav className="flex gap-6">
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
