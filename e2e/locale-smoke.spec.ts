import { test, expect, type Browser } from "@playwright/test";
import { deDE, enUS, zhCN as clerkZhCN } from "@clerk/localizations";
import de from "../messages/de.json";
import en from "../messages/en.json";
import zhCN from "../messages/zh-CN.json";

// Per-Locale smoke checks (#64). The main suite runs in `en` only; this spec
// is the one place that visits every Locale and the unprefixed doorway.
// Expected copy is read from the message files and Clerk's own
// localizations, never hardcoded.
const LOCALES = [
  { prefix: "/de", lang: "de", messages: de, clerk: deDE },
  { prefix: "/en", lang: "en", messages: en, clerk: enUS },
  { prefix: "/zh", lang: "zh-CN", messages: zhCN, clerk: clerkZhCN },
];

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// A fresh context per doorway test so no NEXT_LOCALE cookie leaks between them.
async function visitDoorway(
  browser: Browser,
  { acceptLanguage, cookieLocale }: { acceptLanguage: string; cookieLocale?: string }
) {
  const context = await browser.newContext({ locale: acceptLanguage });
  if (cookieLocale) {
    await context.addCookies([{ name: "NEXT_LOCALE", value: cookieLocale, url: BASE_URL }]);
  }
  const page = await context.newPage();
  await page.goto("/");
  const pathname = new URL(page.url()).pathname;
  await context.close();
  return pathname;
}

test.describe("Locale smoke", () => {
  for (const { prefix, lang, messages, clerk } of LOCALES) {
    test(`${prefix} home renders in ${lang}`, async ({ page }) => {
      await page.goto(prefix);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("heading", { level: 1, name: messages.HomePage.title })).toBeVisible();
      await expect(page.getByRole("link", { name: messages.Navbar.browse, exact: true })).toBeVisible();
    });

    test(`signed-out ${prefix}/dashboard lands on ${prefix}/sign-in`, async ({ page }) => {
      await page.goto(`${prefix}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`^${BASE_URL}${prefix}/sign-in`));
      // Clerk sends the Viewer back to this Locale's dashboard after sign-in.
      const redirectUrl = new URL(page.url()).searchParams.get("redirect_url") ?? "";
      expect(new URL(redirectUrl, BASE_URL).pathname).toBe(`${prefix}/dashboard`);
    });

    test(`${prefix}/sign-in and ${prefix}/sign-up show Clerk in ${lang}`, async ({ page }) => {
      await page.goto(`${prefix}/sign-in`);
      await expect(page.getByRole("button", { name: clerk.formButtonPrimary, exact: true })).toBeVisible();
      // Clerk may render the link relative or absolute; only where it leads matters.
      const signUpLink = page.getByRole("link", { name: clerk.signIn!.start!.actionLink! });
      await expect(signUpLink).toHaveAttribute("href", /sign-up/);
      const signUpUrl = new URL((await signUpLink.getAttribute("href"))!, BASE_URL);
      expect(signUpUrl.origin).toBe(new URL(BASE_URL).origin);
      expect(signUpUrl.pathname).toMatch(new RegExp(`^${prefix}/sign-up`));

      await page.goto(`${prefix}/sign-up`);
      await expect(page.getByRole("heading", { name: clerk.signUp!.start!.title! })).toBeVisible();
    });
  }

  test("doorway follows Accept-Language when there is no cookie", async ({ browser }) => {
    expect(await visitDoorway(browser, { acceptLanguage: "en-US" })).toBe("/en");
    expect(await visitDoorway(browser, { acceptLanguage: "zh-CN" })).toBe("/zh");
    // Traditional-Chinese browsers also get zh-CN, the only Chinese (#42).
    expect(await visitDoorway(browser, { acceptLanguage: "zh-TW" })).toBe("/zh");
  });

  test("doorway prefers the NEXT_LOCALE cookie over Accept-Language", async ({ browser }) => {
    expect(await visitDoorway(browser, { acceptLanguage: "en-US", cookieLocale: "zh-CN" })).toBe("/zh");
  });

  test("doorway falls back to /de for an unmatched language", async ({ browser }) => {
    expect(await visitDoorway(browser, { acceptLanguage: "fr-FR" })).toBe("/de");
  });
});
