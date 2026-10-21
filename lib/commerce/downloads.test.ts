import { describe, it, expect, vi } from "vitest";
import { authorizeDownload, type DownloadDeps } from "@/lib/commerce/downloads";

function deps(overrides: Partial<DownloadDeps> = {}): DownloadDeps {
  return {
    findComponent: async (id) => ({ id, price_cents: 500, zip_path: "seller/c1.zip" }),
    hasEntitlement: async () => false,
    grantEntitlement: async () => ({ error: null }),
    signZipUrl: async (path) => `https://signed/${path}`,
    ...overrides,
  };
}

const args = { profileId: "p1", componentId: "c1" };

describe("authorizeDownload", () => {
  it("404s when the Component is missing or not published", async () => {
    const result = await authorizeDownload(deps({ findComponent: async () => null }), args);
    expect(result).toEqual({ ok: false, status: 404, error: "componentUnavailable" });
  });

  it("404s when the Component has no zip", async () => {
    const result = await authorizeDownload(
      deps({ findComponent: async (id) => ({ id, price_cents: 0, zip_path: null }) }),
      args
    );
    expect(result).toEqual({ ok: false, status: 404, error: "componentUnavailable" });
  });

  it("402s on a paid Component without an Entitlement and never signs a URL", async () => {
    const signZipUrl = vi.fn(async () => "x");
    const result = await authorizeDownload(deps({ signZipUrl }), args);
    expect(result).toEqual({ ok: false, status: 402, error: "purchaseRequired" });
    expect(signZipUrl).not.toHaveBeenCalled();
  });

  it("signs a URL for a paid Component the Profile is entitled to, without granting again", async () => {
    const grantEntitlement = vi.fn(async () => ({ error: null }));
    const result = await authorizeDownload(deps({ hasEntitlement: async () => true, grantEntitlement }), args);
    expect(result).toEqual({ ok: true, url: "https://signed/seller/c1.zip" });
    expect(grantEntitlement).not.toHaveBeenCalled();
  });

  it("grants the Entitlement and signs a URL for a free Component", async () => {
    const grantEntitlement = vi.fn(async () => ({ error: null }));
    const hasEntitlement = vi.fn(async () => false);
    const result = await authorizeDownload(
      deps({ findComponent: async (id) => ({ id, price_cents: 0, zip_path: "z.zip" }), grantEntitlement, hasEntitlement }),
      args
    );
    expect(result).toEqual({ ok: true, url: "https://signed/z.zip" });
    expect(grantEntitlement).toHaveBeenCalledWith("p1", "c1");
    expect(hasEntitlement).not.toHaveBeenCalled();
  });

  it("fails instead of releasing a free zip when the grant fails", async () => {
    const result = await authorizeDownload(
      deps({
        findComponent: async (id) => ({ id, price_cents: 0, zip_path: "z.zip" }),
        grantEntitlement: async () => ({ error: "db down" }),
      }),
      args
    );
    expect(result).toEqual({ ok: false, status: 500, error: "downloadFailed" });
  });

  it("500s when signing fails", async () => {
    const result = await authorizeDownload(deps({ hasEntitlement: async () => true, signZipUrl: async () => null }), args);
    expect(result).toEqual({ ok: false, status: 500, error: "downloadFailed" });
  });
});
