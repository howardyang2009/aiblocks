import { runClientAction, type ClientActionMessages } from "@/lib/client-action";
import type { Locale } from "@/i18n/routing";

// The real effects behind DownloadFlowDeps (lib/commerce/download-flow.ts) —
// built on the shared fetch/parse/catch in lib/client-action.ts instead of
// each repeating it.

export type DownloadEffectResult = { ok: true; url: string } | { ok: false; error: string };

export async function requestDownloadEffect(
  fetchImpl: typeof fetch,
  componentId: string,
  messages: ClientActionMessages
): Promise<DownloadEffectResult> {
  const result = await runClientAction<{ url: string }>(
    fetchImpl,
    `/api/components/${componentId}/download`,
    { method: "POST" },
    messages
  );
  if (!result.ok) return result;
  return { ok: true, url: result.data.url };
}

export async function requestCheckoutEffect(
  fetchImpl: typeof fetch,
  componentId: string,
  withdrawalWaived: boolean,
  locale: Locale,
  messages: ClientActionMessages
): Promise<DownloadEffectResult> {
  const result = await runClientAction<{ url: string }>(
    fetchImpl,
    "/api/checkout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId, withdrawalWaived, locale }),
    },
    messages
  );
  if (!result.ok) return result;
  return { ok: true, url: result.data.url };
}
