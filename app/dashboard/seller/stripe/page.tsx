"use client";

// Stripe onboarding. Calls /api/stripe/connect to get a hosted onboarding
// link, then redirects. Sellers must finish this before selling paid blocks.
export default function StripeOnboardingPage() {
  async function connect() {
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">Seller</p>
      <h1 className="font-display font-bold text-3xl mt-2">Connect payouts</h1>
      <p className="text-muted text-sm mt-3 max-w-md">
        AiBlocks routes payments directly to your Stripe account with a 0%
        platform fee. Connect once to start selling paid components.
      </p>
      <a href="/docs/seller/stripe" className="inline-block mt-3 text-accent text-sm hover:underline">Read the step-by-step onboarding guide →</a>
      <button onClick={connect} className="mt-6 rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
        Connect with Stripe
      </button>
    </div>
  );
}
