"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Shown across the dashboard when a seller has paid components but hasn't
// finished Stripe onboarding. Hides itself on the Stripe page (where the
// action already is) to avoid nagging the seller mid-task.
export function StripeNudge() {
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard/seller/stripe")) return null;

  return (
    <div className="bg-accent text-accent-ink">
      <div className="mx-auto max-w-shell px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          You have paid components, but payouts aren’t connected yet — buyers can’t purchase them until you finish Stripe onboarding.
        </p>
        <Link
          href="/dashboard/seller/stripe"
          className="text-sm font-medium underline whitespace-nowrap"
        >
          Connect Stripe →
        </Link>
      </div>
    </div>
  );
}
