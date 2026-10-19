"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getDownloadState, runDownloadFlow } from "@/lib/commerce/download-flow";
import { requestDownloadEffect, requestCheckoutEffect } from "@/lib/commerce/download-effects";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";

// Handles the three states of acquiring a component:
//   free            -> POST /download, follow the signed URL
//   paid + owned    -> POST /download (re-download)
//   paid + not owned-> POST /checkout, redirect to Stripe
//
// Paid-and-not-owned also requires the EU/EEA withdrawal-right waiver
// checkbox below to be checked before the request is sent — the API
// enforces this server-side too (see app/api/checkout/route.ts), this
// is just the UX layer. See Terms Section 7.
//
// The sign-in/consent checks and the free-vs-paid-vs-checkout branching are
// runDownloadFlow's (lib/commerce/download-flow.ts) — this component only wires the
// real fetch calls into it and follows the resulting redirect.
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
  const t = useTranslations("DownloadButton");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [withdrawalWaived, setWithdrawalWaived] = useState(false);

  const { needsConsent, label } = getDownloadState(priceCents, owned);

  async function handle() {
    setBusy(true);
    setMsg(null);
    const result = await runDownloadFlow(
      {
        requestDownload: () =>
          requestDownloadEffect(fetch, componentId, {
            fallback: t("errors.downloadFailed"),
            network: t("errors.downloadNetwork"),
          }),
        requestCheckout: (waived) =>
          requestCheckoutEffect(fetch, componentId, waived, {
            fallback: t("errors.checkoutFailed"),
            network: t("errors.checkoutNetwork"),
          }),
      },
      {
        signedIn,
        priceCents,
        owned,
        withdrawalWaived,
        messages: { signInRequired: t("errors.signInRequired"), consentRequired: t("errors.consentRequired") },
      }
    );
    setBusy(false);
    if (result.status === "error") {
      setMsg(result.error);
      return;
    }
    window.location.href = result.url; // signed download URL or Stripe Checkout
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
          {/* Waiver wording moves to the Buyer's Locale in #60, together with
              the contract-language line and German wording matching the terms. */}
          <span>
            I want immediate access to this digital component. I understand
            this means I give up my 14-day EU/EEA right of withdrawal, per
            the{" "}
            <Link href="/terms#refunds" className="underline underline-offset-2 hover:text-ink" target="_blank" rel="noopener noreferrer">
              Terms
            </Link>
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
            {t("waiverTooltip")}
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
          className="w-full rounded-block bg-accent text-accent-ink py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
        >
          {busy && <Spinner className="h-4 w-4" />}
          {busy ? t("working") : t(label)}
        </button>
      </div>
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </div>
  );
}
