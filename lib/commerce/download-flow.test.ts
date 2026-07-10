import { describe, it, expect } from "vitest";
import { getDownloadState, runDownloadFlow, type DownloadFlowDeps } from "@/lib/commerce/download-flow";

describe("getDownloadState", () => {
  it("is downloadable, no consent needed, for a free component", () => {
    expect(getDownloadState(0, false)).toEqual({
      isFree: true,
      canDownload: true,
      needsConsent: false,
      label: "Download",
    });
  });

  it("is downloadable, no consent needed, for an owned paid component", () => {
    expect(getDownloadState(500, true)).toEqual({
      isFree: false,
      canDownload: true,
      needsConsent: false,
      label: "Download",
    });
  });

  it("needs consent for a paid component not yet owned", () => {
    expect(getDownloadState(500, false)).toEqual({
      isFree: false,
      canDownload: false,
      needsConsent: true,
      label: "Buy to download",
    });
  });
});

function fakeDeps(opts: {
  download?: { ok: true; url: string } | { ok: false; error: string };
  checkout?: { ok: true; url: string } | { ok: false; error: string };
}): DownloadFlowDeps & { downloadCalls: number; checkoutCalls: unknown[] } {
  const deps = {
    downloadCalls: 0,
    checkoutCalls: [] as unknown[],
    requestDownload: async () => {
      deps.downloadCalls++;
      return opts.download ?? { ok: true, url: "https://storage.example/signed" };
    },
    requestCheckout: async (withdrawalWaived: boolean) => {
      deps.checkoutCalls.push(withdrawalWaived);
      return opts.checkout ?? { ok: true, url: "https://checkout.stripe.com/session" };
    },
  };
  return deps;
}

describe("runDownloadFlow", () => {
  it("errors when signed out, without calling either effect", async () => {
    const deps = fakeDeps({});
    const result = await runDownloadFlow(deps, {
      signedIn: false,
      priceCents: 0,
      owned: false,
      withdrawalWaived: false,
    });
    expect(result).toEqual({ status: "error", error: "Sign in to continue." });
    expect(deps.downloadCalls).toBe(0);
    expect(deps.checkoutCalls).toEqual([]);
  });

  it("errors when a paid, unowned component's waiver isn't checked, without calling either effect", async () => {
    const deps = fakeDeps({});
    const result = await runDownloadFlow(deps, {
      signedIn: true,
      priceCents: 500,
      owned: false,
      withdrawalWaived: false,
    });
    expect(result).toEqual({
      status: "error",
      error: "Please check the box above to confirm before buying.",
    });
    expect(deps.downloadCalls).toBe(0);
    expect(deps.checkoutCalls).toEqual([]);
  });

  it("requests a download for a free component", async () => {
    const deps = fakeDeps({ download: { ok: true, url: "https://storage.example/free" } });
    const result = await runDownloadFlow(deps, {
      signedIn: true,
      priceCents: 0,
      owned: false,
      withdrawalWaived: false,
    });
    expect(result).toEqual({ status: "redirect", url: "https://storage.example/free" });
    expect(deps.downloadCalls).toBe(1);
  });

  it("requests a download (re-download) for an owned paid component", async () => {
    const deps = fakeDeps({ download: { ok: true, url: "https://storage.example/owned" } });
    const result = await runDownloadFlow(deps, {
      signedIn: true,
      priceCents: 500,
      owned: true,
      withdrawalWaived: false,
    });
    expect(result).toEqual({ status: "redirect", url: "https://storage.example/owned" });
    expect(deps.downloadCalls).toBe(1);
  });

  it("requests checkout for a paid, unowned component once the waiver is checked", async () => {
    const deps = fakeDeps({ checkout: { ok: true, url: "https://checkout.stripe.com/session" } });
    const result = await runDownloadFlow(deps, {
      signedIn: true,
      priceCents: 500,
      owned: false,
      withdrawalWaived: true,
    });
    expect(result).toEqual({ status: "redirect", url: "https://checkout.stripe.com/session" });
    expect(deps.checkoutCalls).toEqual([true]);
  });

  it("surfaces a download effect error", async () => {
    const deps = fakeDeps({ download: { ok: false, error: "Could not prepare download." } });
    const result = await runDownloadFlow(deps, {
      signedIn: true,
      priceCents: 0,
      owned: false,
      withdrawalWaived: false,
    });
    expect(result).toEqual({ status: "error", error: "Could not prepare download." });
  });

  it("surfaces a checkout effect error", async () => {
    const deps = fakeDeps({ checkout: { ok: false, error: "Could not start checkout." } });
    const result = await runDownloadFlow(deps, {
      signedIn: true,
      priceCents: 500,
      owned: false,
      withdrawalWaived: true,
    });
    expect(result).toEqual({ status: "error", error: "Could not start checkout." });
  });
});
