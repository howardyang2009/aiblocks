"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Shown across the dashboard when a seller has paid components but hasn't
// finished Stripe onboarding. Hides itself on the Stripe page (where the
// action already is) to avoid nagging the seller mid-task.
export function StripeNudge() {
  const t = useTranslations("StripeNudge");
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard/seller/stripe")) return null;

  return (
    <div className="bg-accent text-accent-ink">
      <div className="mx-auto max-w-shell px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          {t("message")}
        </p>
        <Link
          href="/dashboard/seller/stripe"
          className="text-sm font-medium underline whitespace-nowrap"
        >
          {t("connect")}
        </Link>
      </div>
    </div>
  );
}
