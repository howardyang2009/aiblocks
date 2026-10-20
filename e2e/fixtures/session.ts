import type { Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

type ClerkWindow = { Clerk: { session?: { getToken(opts: { skipCache: boolean }): Promise<string | null> } | null } };

// The saved storageState holds a Clerk session token that lives 60 s. A spec
// that starts near that mark can load a page while the token is still valid,
// see it expire before the first API call, and get a 401 ("Sign in to
// continue.") because clerk-js has not refreshed it yet. Call this before
// such a call: it waits for clerk-js and mints a fresh token, which rewrites
// the __session cookie.
export async function refreshSession(page: Page) {
  await clerk.loaded({ page });
  await page.evaluate(async () => {
    await (window as unknown as ClerkWindow).Clerk.session?.getToken({ skipCache: true });
  });
}
