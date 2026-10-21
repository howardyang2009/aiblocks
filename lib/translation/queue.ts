import "server-only";
import { after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { runTranslationJob, type TranslationJobDb } from "./job";
import { revalidateComponentPages } from "@/lib/component-page-cache";

/**
 * Machine-translates a Component's changed Source text once the response is
 * sent (ADR 0006): a long readme must not hold up the save. Called by the
 * Component create and update routes after a successful write; the job skips
 * unchanged fields. With `retry`, failed or stuck rows are redone too (the
 * retry route). Failures are logged; readers fall back to the Source text.
 */
export function queueTranslations(componentId: string, opts: { retry?: boolean } = {}): void {
  after(async () => {
    try {
      await runTranslationJob(narrowDb<TranslationJobDb>(createServiceClient()), new Anthropic(), componentId, opts);
      revalidateComponentPages();
    } catch (error) {
      console.error("queueTranslations failed:", error instanceof Error ? error.message : error);
    }
  });
}
