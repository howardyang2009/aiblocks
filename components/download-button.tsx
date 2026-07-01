"use client";

import { useState } from "react";

// Handles the three states of acquiring a component:
//   free            -> POST /download, follow the signed URL
//   paid + owned    -> POST /download (re-download)
//   paid + not owned-> POST /checkout, redirect to Stripe
//
// Paid-and-not-owned also requires the EU/EEA withdrawal-right waiver
// checkbox below to be checked before the request is sent — the API
// enforces this server-side too (see app/api/checkout/route.ts), this
// is just the UX layer. See Terms Section 7.
export function DownloadButton({
  componentId,
  priceCents,
  owned,
  signedIn,
}: {
  componentId: string;
  priceCents: number;
  owned: boolean;
  signedIn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [withdrawalWaived, setWithdrawalWaived] = useState(false);

  const isFree = priceCents === 0;
  const canDownload = isFree || owned;
  const needsConsent = !canDownload; // only the actual purchase path
  const label = canDownload ? "Download" : "Buy to download";

  async function handle() {
    if (!signedIn) {
      setMsg("Sign in to continue.");
      return;
    }
    if (needsConsent && !withdrawalWaived) {
      setMsg("Please check the box above to confirm before buying.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (canDownload) {
        const res = await fetch(`/api/components/${componentId}/download`, { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not prepare download.");
        window.location.href = json.url; // short-lived signed URL
      } else {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ componentId, withdrawalWaived }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not start checkout.");
        window.location.href = json.url; // Stripe Checkout
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {needsConsent && (
        <label className="mb-3 flex items-start gap-2 text-xs text-muted leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={withdrawalWaived}
            onChange={(e) => {
              setWithdrawalWaived(e.target.checked);
              if (e.target.checked) setMsg(null);
            }}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-ink"
          />
          <span>
            I want immediate access to this digital component. I understand
            this means I give up my 14-day EU/EEA right of withdrawal, per
            the{" "}
            <a href="/terms#refunds" className="underline underline-offset-2 hover:text-ink" target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            .
          </span>
        </label>
      )}
      <button
        onClick={handle}
        disabled={busy || (needsConsent && !withdrawalWaived)}
        className="w-full rounded-block bg-ink text-paper py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
      >
        {busy ? "Working…" : label}
      </button>
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </div>
  );
}
