import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { RheinWegLogo, RHEINWEG_URL } from "@/components/brand/rheinweg-logo";

export function Navbar() {
  return (
    <header className="border-b bg-surface">
      <div className="mx-auto max-w-shell px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <RheinWegLogo />
            <span className="font-display font-bold text-lg tracking-tight">AiBlocks</span>
          </Link>
          <a href={RHEINWEG_URL} className="hidden sm:inline font-mono text-xs text-subtle hover:text-accent">by RheinWeg</a>
        </div>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/browse" className="text-muted hover:text-ink">Browse</Link>
          <Show when="signed-in">
            <Link href="/dashboard/seller/new" className="text-muted hover:text-ink">Publish</Link>
            <Link href="/dashboard/downloads" className="text-muted hover:text-ink">My downloads</Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-block bg-accent text-accent-ink px-3.5 py-1.5 text-sm hover:bg-accent-strong transition-colors">
                Sign in
              </button>
            </SignInButton>
          </Show>
        </nav>
      </div>
    </header>
  );
}
