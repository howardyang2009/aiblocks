import { describe, it, expect, vi } from "vitest";
import { requestDownloadEffect, requestCheckoutEffect } from "@/lib/commerce/download-effects";

// Only each wrapper's own logic is tested here — see comments-effects.test.ts
// for why the failure paths aren't re-tested per wrapper.

function fakeFetch(response: { ok: boolean; body?: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
}

describe("requestDownloadEffect", () => {
  it("POSTs to the component's download route and returns the signed URL", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { url: "https://storage.example.com/signed1" } });

    const result = await requestDownloadEffect(fetchImpl, "comp1");

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/comp1/download", { method: "POST" });
    expect(result).toEqual({ ok: true, url: "https://storage.example.com/signed1" });
  });
});

describe("requestCheckoutEffect", () => {
  it("POSTs the component id and withdrawal waiver, and returns the Stripe URL", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { url: "https://checkout.stripe.com/session1" } });

    const result = await requestCheckoutEffect(fetchImpl, "comp1", true);

    expect(fetchImpl).toHaveBeenCalledWith("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId: "comp1", withdrawalWaived: true }),
    });
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/session1" });
  });
});
