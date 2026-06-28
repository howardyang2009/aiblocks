"use client";

import { useState } from "react";

// Handles the three states of acquiring a component:
//   free            -> POST /download, follow the signed URL
//   paid + owned    -> POST /download (re-download)
//   paid + not owned-> POST /checkout, redirect to Stripe
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

  const isFree = priceCents === 0;
  const canDownload = isFree || owned;
  const label = canDownload ? "Download" : "Buy to download";

  async function handle() {
    if (!signedIn) {
      setMsg("Sign in to continue.");
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
          body: JSON.stringify({ componentId }),
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
      <button
        onClick={handle}
        disabled={busy}
        className="w-full rounded-block bg-ink text-paper py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
      >
        {busy ? "Working…" : label}
      </button>
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </div>
  );
}
