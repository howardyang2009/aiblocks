import { test, expect, type Page } from "@playwright/test";
import de from "../messages/de.json";
import en from "../messages/en.json";
import zhCN from "../messages/zh-CN.json";
import { seedPublishedComponent } from "./fixtures/seed";

// Search engines see each Locale correctly (#68): hreflang via `Link`
// headers, a self-referencing canonical, sitemap, robots and per-Locale
// titles. Expected copy is read from the message files, never hardcoded.
const LOCALES = [
  { prefix: "/de", messages: de },
  { prefix: "/en", messages: en },
  { prefix: "/zh", messages: zhCN },
];

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
// The seed fixture's shared Seller (e2e/fixtures/seed.ts).
const SEED_SELLER = "e2e-seed-seller";

const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute("href");
const robotsMeta = (page: Page) => page.locator('meta[name="robots"]').getAttribute("content");

test.describe("SEO per Locale", () => {
  let seeded: { id: string; name: string };

  test.beforeAll(async () => {
    seeded = await seedPublishedComponent({
      name: `SEO Spec Widget ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  });

  test("page responses carry hreflang Link headers with an unprefixed x-default", async ({ request }) => {
    const response = await request.get("/en/about", { maxRedirects: 0 });
    const link = response.headers()["link"] ?? "";
    expect(link).toContain(`<${BASE_URL}/de/about>; rel="alternate"; hreflang="de"`);
    expect(link).toContain(`<${BASE_URL}/en/about>; rel="alternate"; hreflang="en"`);
    expect(link).toContain(`<${BASE_URL}/zh/about>; rel="alternate"; hreflang="zh-CN"`);
    expect(link).toContain(`<${BASE_URL}/about>; rel="alternate"; hreflang="x-default"`);
  });

  test("hreflang is never repeated as <link rel=alternate> tags in the HTML", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  });

  for (const { prefix, messages } of LOCALES) {
    test(`${prefix} pages have a self-referencing canonical`, async ({ page }) => {
      for (const path of ["", "/browse", "/privacy", `/components/${seeded.id}`, `/sellers/${SEED_SELLER}`]) {
        await page.goto(`${prefix}${path}`);
        expect(await canonical(page)).toBe(`${BASE_URL}${prefix}${path}`);
      }
    });

    test(`${prefix} static pages show translated titles and descriptions`, async ({ page }) => {
      await page.goto(prefix);
      await expect(page).toHaveTitle(messages.Metadata.title);

      await page.goto(`${prefix}/privacy`);
      await expect(page).toHaveTitle(`${messages.Metadata.privacy.title} · AiBlocks`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        messages.Metadata.privacy.description
      );

      await page.goto(`${prefix}/impressum`);
      await expect(page).toHaveTitle("Impressum · AiBlocks");
    });

    test(`${prefix} Component and Seller pages are titled by name`, async ({ page }) => {
      await page.goto(`${prefix}/components/${seeded.id}`);
      await expect(page).toHaveTitle(`${seeded.name} · AiBlocks`);

      await page.goto(`${prefix}/sellers/${SEED_SELLER}`);
      await expect(page).toHaveTitle(`${SEED_SELLER} · AiBlocks`);
    });

    test(`${prefix} sign-in, sign-up and search are noindex`, async ({ page }) => {
      for (const path of ["/sign-in", "/sign-up", "/search?q=agent"]) {
        await page.goto(`${prefix}${path}`);
        expect(await robotsMeta(page)).toContain("noindex");
      }
      await page.goto(`${prefix}/browse`);
      expect(await page.locator('meta[name="robots"]').count()).toBe(0);
    });
  }

  test("robots.txt keeps crawlers out of the API and dashboards and links the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Disallow: /*/dashboard");
    expect(body).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`);
  });

  test("sitemap.xml lists static, Component and Seller pages in every Locale", async ({ request }) => {
    const response = await request.get("/sitemap.xml", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const body = await response.text();
    for (const { prefix } of LOCALES) {
      for (const path of ["", "/browse", "/impressum", "/docs/seller/stripe", `/components/${seeded.id}`, `/sellers/${SEED_SELLER}`]) {
        expect(body).toContain(`<loc>${BASE_URL}${prefix}${path}</loc>`);
      }
    }
    expect(body).not.toMatch(/dashboard|sign-in|sign-up|\/search|\/api\//);
    expect(body).not.toContain("hreflang");
  });
});
