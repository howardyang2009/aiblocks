import { test, expect } from "@playwright/test";
import path from "node:path";

// One signed-in identity drives this whole journey, so each step depends on
// the previous one's output (the same published component) — test.describe.serial
// keeps that dependency explicit while still reporting each step individually.
test.describe.serial("publish, download, and engage", () => {
  const componentName = `E2E Publish Test ${Date.now()}`;
  let componentId = "";

  test("publishes a free component", async ({ page }) => {
    await page.goto("/dashboard/seller/new");

    await page.getByLabel("Name").fill(componentName);
    await page.getByLabel("Short description").fill("A component published end-to-end by Playwright.");
    await page.getByLabel("Ecosystems (comma separated)").fill("claude");
    await page
      .getByLabel("Component zip (max 10MB)")
      .setInputFiles(path.join(__dirname, "fixtures", "test-component.zip"));

    await page.getByRole("button", { name: "Publish" }).click();

    await expect(page.getByRole("heading", { name: `${componentName} is live` })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "View component" }).click();
    await expect(page).toHaveURL(/\/components\/[\w-]+$/);
    componentId = page.url().split("/components/")[1];

    await expect(page.getByRole("heading", { name: componentName })).toBeVisible();
  });

  test("downloads it — the paywall grants access and records the entitlement", async ({ page }) => {
    await page.goto(`/components/${componentId}`);

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/components/${componentId}/download`) && res.request().method() === "POST"
      ),
      page.getByTestId("download-button").click(),
    ]);

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(typeof body.url).toBe("string");
    expect(body.url.length).toBeGreaterThan(0);

    await page.goto("/dashboard/downloads");
    await expect(page.getByRole("heading", { name: componentName })).toBeVisible();
  });

  test("stars the component", async ({ page }) => {
    await page.goto(`/components/${componentId}`);
    const star = page.getByTestId("star-button");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/components/${componentId}/star`)),
      star.click(),
    ]);

    expect(response.ok()).toBe(true);
    await expect(star).toHaveClass(/border-accent/);
  });

  test("comments on the component", async ({ page }) => {
    await page.goto(`/components/${componentId}`);

    const commentText = `Great component — e2e comment ${Date.now()}`;
    await page.getByTestId("comment-input").fill(commentText);
    await page.getByTestId("comment-submit").click();

    await expect(page.getByText(commentText)).toBeVisible();
  });

  test("does not offer a review form to the seller reviewing their own component", async ({ page }) => {
    await page.goto(`/components/${componentId}`);

    // Sellers can't review their own components (CONTEXT.md, reviews-section.tsx)
    // — this test user published it, so the write form must not render, even
    // though they own an entitlement from the download step above.
    await expect(page.getByTestId("review-body")).toHaveCount(0);
    await expect(
      page.getByText("Sellers can't review their own components")
    ).toBeVisible();
  });

  test("edits the component — the edit form saves and redirects to the live listing", async ({ page }) => {
    const editedName = `${componentName} (edited)`;
    await page.goto(`/dashboard/seller/${componentId}/edit`);

    await page.getByLabel("Name").fill(editedName);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(`/components/${componentId}`);
    await expect(page.getByRole("heading", { name: editedName })).toBeVisible();
  });
});
