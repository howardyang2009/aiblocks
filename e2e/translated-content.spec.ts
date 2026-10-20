import { test, expect } from "@playwright/test";
import de from "../messages/de.json";
import { seedPublishedComponent, seedTranslation } from "./fixtures/seed";

// Signed-out: what readers see of Seller content in each Locale, and search
// across Translations (#70). Translations are seeded directly; the job
// itself runs against the mock Anthropic server in translation-job.spec.ts.

// Letters only: the `simple` text-search parser keeps a word with digits as
// one token, but a unique plain word is the clearest probe.
const uniqueWord = () =>
  Array.from({ length: 12 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

test("a Locale with no Translation yet shows the Source text", async ({ page }) => {
  const description = `English source text ${uniqueWord()}`;
  const component = await seedPublishedComponent({ name: `Untranslated ${uniqueWord()}`, description });
  await seedTranslation(component.id, {
    locale: "de",
    field: "description",
    text: `Deutscher Text ${uniqueWord()}`,
    sourceText: description,
  });

  await page.goto(`/zh/components/${component.id}`);
  await expect(page.getByText(description)).toBeVisible();
  await expect(page.getByTestId("machine-translation-note")).toHaveCount(0);
});

test("a German query finds a Component written in Chinese via its de Translation", async ({ page }) => {
  const word = uniqueWord();
  const description = "一个帮助代理整理邮件的组件";
  const component = await seedPublishedComponent({
    name: `Chinese Source ${uniqueWord()}`,
    description,
    sourceLanguage: "zh-CN",
  });
  const translated = `Eine Komponente, die E-Mails sortiert: ${word}`;
  await seedTranslation(component.id, { locale: "de", field: "description", text: translated, sourceText: description });

  await page.goto(`/de/browse?q=${word}`);
  const card = page.getByRole("link", { name: new RegExp(component.name) });
  await expect(card).toBeVisible();
  await expect(card).toContainText(translated);
  await expect(card).toContainText(de.MachineTranslation.label);
});
