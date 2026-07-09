import { describe, it, expect, vi } from "vitest";
import { requestCheckoutEffect } from "@/lib/commerce/download-effects";

function fakeFetch(response: { ok: boolean; body?: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
}

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

  it("falls back to a generic error when the server sends none", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: {} });

    const result = await requestCheckoutEffect(fetchImpl, "comp1", true);

    expect(result).toEqual({ ok: false, error: "Could not start checkout." });
  });
});
