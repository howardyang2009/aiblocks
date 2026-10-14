import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <header className="border-b bg-surface">
      <div className="mx-auto max-w-shell px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <svg aria-hidden className="h-7 w-7" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" className="fill-accent" />
            <path d="M6 20c4-6 8 2 12-4s6-4 8-2" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="font-display font-bold text-lg tracking-tight">AiBlocks</span>
        </Link>

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
