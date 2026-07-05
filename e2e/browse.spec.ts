import { test, expect } from "@playwright/test";
import { seedPublishedComponent } from "./fixtures/seed";

// Signed-out: the public marketplace surface. No Clerk, no auth project
// dependency — a real visitor never signs in to look around.
test.describe("browse & search", () => {
  let seeded: { id: string; name: string; slug: string | null };

  test.beforeAll(async () => {
    // `fullyParallel: true` can run this beforeAll in more than one worker
    // for the same test run — a bare Date.now() suffix collides when two
    // workers seed within the same millisecond (two components would get
    // the identical name, breaking the exact-name search/click below), so
    // this needs the same random-suffix treatment as the fixture's slug.
    seeded = await seedPublishedComponent({
      name: `Browse Spec Widget ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  });

  test("home links into the browse catalog", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Reusable AI components/i })).toBeVisible();

    await page.getByRole("link", { name: "Browse components" }).click();
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.getByRole("heading", { name: "Browse components" })).toBeVisible();
  });

  test("searching for a real component finds it", async ({ page }) => {
    await page.goto("/browse");
    await page.getByPlaceholder("Search components…").fill(seeded.name);
    await page.getByPlaceholder("Search components…").press("Enter");

    await expect(page).toHaveURL(/\/browse\?q=/);
    await expect(page.getByRole("link", { name: new RegExp(seeded.name) })).toBeVisible();
  });

  test("searching for a nonexistent component shows the empty state", async ({ page }) => {
    await page.goto("/browse");
    const nonsense = `no-such-component-${Date.now()}`;
    await page.getByPlaceholder("Search components…").fill(nonsense);
    await page.getByPlaceholder("Search components…").press("Enter");

    await expect(page.getByText("No components match yet.")).toBeVisible();
  });

  test("sort links change the query string", async ({ page }) => {
    await page.goto("/browse");
    await page.getByRole("link", { name: "Most downloaded" }).click();
    await expect(page).toHaveURL(/sort=downloads/);

    await page.getByRole("link", { name: "Most starred" }).click();
    await expect(page).toHaveURL(/sort=stars/);
  });

  test("opening a component from the catalog shows its detail page", async ({ page }) => {
    await page.goto(`/browse?q=${encodeURIComponent(seeded.name)}`);
    await page.getByRole("link", { name: new RegExp(seeded.name) }).click();

    await expect(page).toHaveURL(new RegExp(`/components/${seeded.id}`));
    await expect(page.getByRole("heading", { name: seeded.name })).toBeVisible();
    await expect(page.getByText("Free")).toBeVisible();
  });
});
