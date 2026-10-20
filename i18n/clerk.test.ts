import { describe, it, expect } from "vitest";
import { deDE, enUS, zhCN } from "@clerk/localizations";
import { clerkProviderProps } from "@/i18n/clerk";

describe("clerkProviderProps", () => {
  it("renders Clerk's UI in each Locale's language", () => {
    expect(clerkProviderProps("de").localization).toBe(deDE);
    expect(clerkProviderProps("en").localization).toBe(enUS);
    expect(clerkProviderProps("zh-CN").localization).toBe(zhCN);
  });

  it("keeps sign-in and sign-up on the current Locale's prefix", () => {
    expect(clerkProviderProps("en")).toMatchObject({ signInUrl: "/en/sign-in", signUpUrl: "/en/sign-up" });
    expect(clerkProviderProps("zh-CN")).toMatchObject({ signInUrl: "/zh/sign-in", signUpUrl: "/zh/sign-up" });
  });

  it("returns to the current Locale when there is no redirect_url", () => {
    expect(clerkProviderProps("de")).toMatchObject({
      signInFallbackRedirectUrl: "/de",
      signUpFallbackRedirectUrl: "/de",
    });
  });

  it("returns to the current Locale after sign-out", () => {
    expect(clerkProviderProps("de").afterSignOutUrl).toBe("/de");
    expect(clerkProviderProps("zh-CN").afterSignOutUrl).toBe("/zh");
  });
});
