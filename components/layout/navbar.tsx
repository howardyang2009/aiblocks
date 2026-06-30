"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <header className="border-b bg-surface">
      <div className="mx-auto max-w-shell px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid grid-cols-2 gap-0.5" aria-hidden>
            <i className="block w-2 h-2 rounded-[2px] bg-ink" />
            <i className="block w-2 h-2 rounded-[2px] bg-accent" />
            <i className="block w-2 h-2 rounded-[2px] bg-accent" />
            <i className="block w-2 h-2 rounded-[2px] bg-ink" />
          </span>
          <span className="font-display font-bold text-lg tracking-tight">AiBlocks</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/browse" className="text-muted hover:text-ink">Browse</Link>
          <SignedIn>
            <Link href="/dashboard/seller/new" className="text-muted hover:text-ink">Publish</Link>
            <Link href="/dashboard/downloads" className="text-muted hover:text-ink">My downloads</Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-block bg-ink text-paper px-3.5 py-1.5 text-sm hover:bg-accent transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
