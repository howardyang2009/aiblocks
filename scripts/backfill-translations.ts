// One-off backfill for #69: guesses a source language for every Component
// that has none, then machine-translates every published Component.
// Run once in production after migration 0008, then apply 0009:
//
//   npx tsx --env-file=.env.production.local scripts/backfill-translations.ts --dry-run
//   npx tsx --env-file=.env.production.local scripts/backfill-translations.ts
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
// ANTHROPIC_API_KEY. Safe to re-run.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { backfillTranslations, type BackfillDb } from "@/lib/translation/backfill";
import { runTranslationJob, type TranslationJobDb } from "@/lib/translation/job";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

async function main(url: string, key: string) {
  // A plain supabase-js client, not lib/supabase/server (that one is
  // "server-only" and cannot load outside Next), so narrowDb does not apply.
  const supabase = createClient(url, key);
  const client = new Anthropic();
  const dryRun = process.argv.includes("--dry-run");

  const summary = await backfillTranslations(supabase as unknown as BackfillDb, client, {
    dryRun,
    log: console.log,
    translate: (componentId) =>
      runTranslationJob(supabase as unknown as TranslationJobDb, client, componentId, { retry: true }),
  });
  console.log(
    `${dryRun ? "[dry run] " : ""}guessed ${summary.guessed} source languages, translated ${summary.translated} Components`
  );
}

main(url, key).catch((error) => {
  console.error(error);
  process.exit(1);
});
