import "server-only";
import { after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { runTranslationJob, type TranslationJobDb } from "./job";

/**
 * Machine-translates a Component's changed Source text once the response is
 * sent (ADR 0006): a long readme must not hold up the save. Called by the
 * Component create and update routes after a successful write; the job skips
 * unchanged fields. Failures are logged; readers fall back to the Source text.
 */
export function queueTranslations(componentId: string): void {
  after(async () => {
    try {
      await runTranslationJob(narrowDb<TranslationJobDb>(createServiceClient()), new Anthropic(), componentId);
    } catch (error) {
      console.error("queueTranslations failed:", error instanceof Error ? error.message : error);
    }
  });
}
