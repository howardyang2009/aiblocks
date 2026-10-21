import { describe, it, expect, vi } from "vitest";
import { requestDownloadEffect, requestCheckoutEffect } from "@/lib/commerce/download-effects";

// Only each wrapper's own logic is tested here: the failure paths belong to
// runClientAction (lib/client-action.ts) and aren't re-tested per wrapper.

function fakeFetch(response: { ok: boolean; body?: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
}

// Stand-in for the translated copy the component passes in.
const messages = { fallback: "FALLBACK", network: "NETWORK" };

describe("requestDownloadEffect", () => {
  it("POSTs to the component's download route and returns the signed URL", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { url: "https://storage.example.com/signed1" } });

    const result = await requestDownloadEffect(fetchImpl, "comp1", messages);

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/comp1/download", { method: "POST" });
    expect(result).toEqual({ ok: true, url: "https://storage.example.com/signed1" });
  });
});

describe("requestCheckoutEffect", () => {
  it("POSTs the component id, withdrawal waiver and Locale, and returns the Stripe URL", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { url: "https://checkout.stripe.com/session1" } });

    const result = await requestCheckoutEffect(fetchImpl, "comp1", true, "zh-CN", messages);

    expect(fetchImpl).toHaveBeenCalledWith("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId: "comp1", withdrawalWaived: true, locale: "zh-CN" }),
    });
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/session1" });
  });
});

describe("failure messages", () => {
  const throwingFetch = vi.fn(async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;

  it.each([
    ["requestDownloadEffect", () => requestDownloadEffect(throwingFetch, "comp1", messages)],
    ["requestCheckoutEffect", () => requestCheckoutEffect(throwingFetch, "comp1", true, "de", messages)],
  ])("%s reports the caller's network message", async (_name, call) => {
    expect(await call()).toEqual({ ok: false, error: "NETWORK" });
  });
});
