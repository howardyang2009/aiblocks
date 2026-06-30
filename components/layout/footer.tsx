import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-surface mt-16">
      <div className="mx-auto max-w-shell px-5 py-12 grid gap-8 sm:grid-cols-[1fr_auto_auto]">
        <p className="font-mono text-xs text-muted">AiBlocks — npm for AI components</p>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">Sell</span>
          <Link href="/docs/seller/publish" className="text-muted hover:text-ink">Publishing guide</Link>
          <Link href="/docs/seller/stripe" className="text-muted hover:text-ink">Get paid with Stripe</Link>
        </nav>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">About</span>
          <Link href="/about" className="text-muted hover:text-ink">About</Link>
          <Link href="/terms" className="text-muted hover:text-ink">Terms</Link>
          <Link href="/privacy" className="text-muted hover:text-ink">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
