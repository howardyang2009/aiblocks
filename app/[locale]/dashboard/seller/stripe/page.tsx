"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Stripe onboarding. Calls /api/stripe/connect to get a hosted onboarding
// link, then redirects. Sellers must finish this before selling paid blocks.
export default function StripeOnboardingPage() {
  const t = useTranslations("StripePage");
  async function connect() {
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="font-display font-bold text-3xl mt-2">{t("title")}</h1>
      <p className="text-muted text-sm mt-3 max-w-md">{t("body")}</p>
      <Link href="/docs/seller/stripe" className="inline-block mt-3 text-accent text-sm hover:underline">{t("guide")}</Link>
      <button onClick={connect} className="mt-6 rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors">
        {t("connect")}
      </button>
    </div>
  );
}
