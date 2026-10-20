import { test, expect } from "@playwright/test";
import de from "../messages/de.json";
import en from "../messages/en.json";
import zhCN from "../messages/zh-CN.json";

// The footer Locale switcher (#54). Expected copy comes from the message
// files: a Locale's own name is its name in its own message file.
const DEUTSCH = de.LocaleSwitcher.names.de;
const ENGLISH = en.LocaleSwitcher.names.en;
const ZHONGWEN = zhCN.LocaleSwitcher.names["zh-CN"];
const ONE_YEAR = 60 * 60 * 24 * 365;

test.describe("Locale switcher", () => {
  test("lists every Locale with subtitles in the current Locale", async ({ page }) => {
    await page.goto("/de");
    await page.getByRole("button", { name: `${de.LocaleSwitcher.label}: ${DEUTSCH}` }).click();

    const dialog = page.getByRole("dialog", { name: de.LocaleSwitcher.title });
    await expect(dialog).toBeVisible();
    // Accessible names leave out the aria-hidden check mark.
    const entry = (ownName: string, subtitle: string) =>
      dialog.getByRole("link", { name: new RegExp(`^${ownName}\\s*${subtitle}$`) });
    await expect(dialog.getByRole("link")).toHaveCount(3);
    const deutsch = entry(DEUTSCH, de.LocaleSwitcher.names.de);
    await expect(deutsch).toHaveAttribute("aria-current", "true");
    await expect(deutsch).toContainText("✓");
    await expect(entry(ENGLISH, de.LocaleSwitcher.names.en)).not.toHaveAttribute("aria-current");
    await expect(entry(ZHONGWEN, de.LocaleSwitcher.names["zh-CN"])).not.toHaveAttribute("aria-current");
  });

  test("keyboard: opens, keeps focus inside, closes on Escape", async ({ page }) => {
    await page.goto("/en");
    const button = page.getByRole("button", { name: `${en.LocaleSwitcher.label}: ${ENGLISH}` });
    await button.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: en.LocaleSwitcher.title });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      // Between the last and first dialog control, focus passes through the
      // browser UI (activeElement is <body>), but never the page behind.
      expect(await page.evaluate(() => {
        const active = document.activeElement;
        return active === document.body || !!active?.closest("dialog");
      })).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("switch keeps path, query and hash and remembers the choice", async ({ page }) => {
    await page.goto("/en/browse?q=agent#results");
    await page.getByRole("button", { name: `${en.LocaleSwitcher.label}: ${ENGLISH}` }).click();
    await page.getByRole("dialog").getByRole("link", { name: new RegExp(`^${DEUTSCH}`) }).click();

    await expect(page).toHaveURL(/\/de\/browse\?q=agent#results$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    const cookie = (await page.context().cookies()).find((c) => c.name === "RHEINWEG_LOCALE");
    expect(cookie?.value).toBe("de");
    // One-year maxAge, give or take the test's own runtime.
    expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(ONE_YEAR - 60);

    // The browser asks for en-US, but the remembered choice wins at the doorway.
    await page.goto("/");
    await expect(page).toHaveURL(/\/de$/);
  });
});
