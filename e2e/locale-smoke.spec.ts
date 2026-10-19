import { test, expect, type Browser } from "@playwright/test";
import de from "../messages/de.json";
import en from "../messages/en.json";
import zhCN from "../messages/zh-CN.json";

// Per-Locale smoke checks (#64). The main suite runs in `en` only; this spec
// is the one place that visits every Locale and the unprefixed doorway.
// Expected copy is read from the message files, never hardcoded.
const LOCALES = [
  { prefix: "/de", lang: "de", messages: de },
  { prefix: "/en", lang: "en", messages: en },
  { prefix: "/zh", lang: "zh-CN", messages: zhCN },
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
  for (const { prefix, lang, messages } of LOCALES) {
    test(`${prefix} home renders in ${lang}`, async ({ page }) => {
      await page.goto(prefix);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("heading", { level: 1, name: messages.HomePage.title })).toBeVisible();
      await expect(page.getByRole("link", { name: messages.Navbar.browse, exact: true })).toBeVisible();
    });

    test(`signed-out ${prefix}/dashboard lands on ${prefix}/sign-in`, async ({ page }) => {
      await page.goto(`${prefix}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`^${BASE_URL}${prefix}/sign-in`));
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
