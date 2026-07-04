import { test as setup, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

const AUTH_FILE = "e2e/.auth/user.json";

// This IS the sign-in test, not a shortcut around one: it drives a real
// Clerk sign-in (clerk.signIn only bypasses Clerk's bot-detection challenge,
// not the auth flow itself) and asserts the app actually lands
// authenticated. Every other signed-in spec then reuses the saved session
// instead of re-driving this flow per spec.
setup("authenticate", async ({ page }) => {
  const email = process.env.CLERK_TEST_USER_EMAIL;
  if (!email) {
    throw new Error(
      "CLERK_TEST_USER_EMAIL must be set in .env.test.local (see e2e/README.md for how to create the test user)."
    );
  }

  // Clerk must be loaded on the page before clerk.signIn can drive it.
  await page.goto("/");

  // Email-based sign-in (not a strategy/password pair): the helper mints a
  // sign-in ticket via Clerk's Backend API and completes it with the
  // "ticket" strategy, entirely bypassing first-factor UI/security nuances
  // (e.g. password sign-in from an unrecognized client can return
  // "needs_client_trust", which the bot-detection testing token does not
  // cover). No password needed — just an existing user with this email.
  await clerk.signIn({ page, emailAddress: email });

  await page.goto("/dashboard/downloads");
  await expect(page.getByRole("heading", { name: "My downloads" })).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
