"use client";

import { useState } from "react";
import { isFreeComponent } from "@/lib/utils";

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

  const isFree = isFreeComponent(priceCents);
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
      {/* Wrapper carries the hover state: disabled buttons don't reliably
          fire their own mouse events cross-browser, but CSS group-hover on
          the parent works regardless of the button's disabled state. */}
      <div className="relative group">
        {needsConsent && !withdrawalWaived && (
          <div
            id="withdrawal-consent-tooltip"
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[260px] -translate-x-1/2 rounded-block bg-ink px-3 py-2 text-center text-xs leading-relaxed text-paper opacity-0 invisible transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
          >
            Please agree to and check the 14-day withdrawal policy checkbox
            above to start the payment process.
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
          </div>
        )}
        <button
          onClick={handle}
          disabled={busy || (needsConsent && !withdrawalWaived)}
          data-testid="download-button"
          aria-describedby={
            needsConsent && !withdrawalWaived ? "withdrawal-consent-tooltip" : undefined
          }
          className="w-full rounded-block bg-ink text-paper py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Working…" : label}
        </button>
      </div>
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </div>
  );
}
