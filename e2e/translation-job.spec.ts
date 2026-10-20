import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import de from "../messages/de.json";
import { serviceClient } from "./fixtures/seed";

// Signed-in: a Seller publishes, and the translation job's Claude calls go
// to the mock Anthropic server (#70), which answers `[de] <source>`.

const MOCK_URL = process.env.ANTHROPIC_BASE_URL ?? "http://127.0.0.1:4010";

async function publish(page: Page, name: string, description: string, readme?: string): Promise<string> {
  await page.goto("/en/dashboard/seller/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Short description").fill(description);
  if (readme !== undefined) await page.getByLabel("README (markdown)").fill(readme);
  await page.getByLabel("Ecosystems (comma separated)").fill("claude");
  await page.getByLabel("Component zip (max 10MB)").setInputFiles(path.join(__dirname, "fixtures", "test-component.zip"));
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("heading", { name: `${name} is live` })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "View component" }).click();
  await expect(page).toHaveURL(/\/components\/[\w-]+$/);
  return page.url().split("/components/")[1];
}

// The job runs after the response is sent; reload until it has finished.
async function expectAfterReload(page: Page, url: string, check: () => Promise<void>) {
  await expect(async () => {
    await page.goto(url);
    await check();
  }).toPass({ timeout: 30_000 });
}

async function descriptionStatus(componentId: string): Promise<string | undefined> {
  const { data } = await serviceClient()
    .from("component_translations")
    .select("status")
    .eq("component_id", componentId)
    .eq("locale", "de")
    .eq("field", "description")
    .maybeSingle();
  return data?.status;
}

test("an en Component shows its de Translation with the note, and Show original swaps in place", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const description = `Sorts an agent's inbox ${stamp}`;
  const id = await publish(page, `E2E Translated ${stamp}`, description);
  const url = `/de/components/${id}`;

  await expectAfterReload(page, url, async () => {
    await expect(page.getByText(`[de] ${description}`)).toBeVisible({ timeout: 1_000 });
  });
  // The description's note comes first; the readme has its own.
  const note = page.getByTestId("machine-translation-note").first();
  await expect(note).toContainText(de.MachineTranslation.label);

  await note.getByRole("button", { name: de.MachineTranslation.showOriginal }).click();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await expect(page.getByText(`[de] ${description}`)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${url}$`));
});

test("a failed Translation shows the Source text, and Retry produces a ready Translation", async ({ page }) => {
  const marker = `fail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const description = `Fails first ${marker}`;
  await fetch(`${MOCK_URL}/__mock/fail`, { method: "POST", body: JSON.stringify({ marker }) });

  // The readme carries the marker too, so neither field gets a Translation.
  const id = await publish(page, `E2E Retry ${marker}`, description, `Readme ${marker}`);
  await expect.poll(() => descriptionStatus(id), { timeout: 30_000 }).toBe("failed");

  await page.goto(`/de/components/${id}`);
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await expect(page.getByTestId("machine-translation-note")).toHaveCount(0);

  await fetch(`${MOCK_URL}/__mock/fail`, { method: "DELETE", body: JSON.stringify({ marker }) });
  const status = await page.evaluate(
    (componentId) => fetch(`/api/components/${componentId}/translations/retry`, { method: "POST" }).then((r) => r.status),
    id
  );
  expect(status).toBe(202);

  await expect.poll(() => descriptionStatus(id), { timeout: 30_000 }).toBe("ready");
  await page.goto(`/de/components/${id}`);
  await expect(page.getByText(`[de] ${description}`)).toBeVisible();
  await expect(page.getByTestId("machine-translation-note").first()).toBeVisible();
});
