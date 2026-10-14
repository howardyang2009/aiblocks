import Link from "next/link";
import { RheinWegLogo, RHEINWEG_URL } from "@/components/brand/rheinweg-logo";

export function Footer() {
  return (
    <footer className="border-t bg-surface mt-16">
      <div className="mx-auto max-w-shell px-5 py-12 grid gap-8 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <a href={RHEINWEG_URL} className="inline-flex items-center gap-2 hover:text-accent">
            <RheinWegLogo className="h-6 w-6" />
            <span className="font-display font-bold tracking-tight">AiBlocks by RheinWeg</span>
          </a>
          <p className="font-mono text-xs text-muted mt-3">npm for AI components</p>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">Sell</span>
          <Link href="/docs/seller/publish" className="text-muted hover:text-ink">Publishing guide</Link>
          <Link href="/docs/seller/stripe" className="text-muted hover:text-ink">Get paid with Stripe</Link>
        </nav>

        <nav className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">About</span>
          <Link href="/about" className="text-muted hover:text-ink">About</Link>
          <Link href="/contact" className="text-muted hover:text-ink">Contact</Link>
          <Link href="/impressum" className="text-muted hover:text-ink">Impressum</Link>
          <Link href="/terms" className="text-muted hover:text-ink">Terms</Link>
          <Link href="/privacy" className="text-muted hover:text-ink">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
