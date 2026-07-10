import { runClientAction } from "@/lib/client-action";

// The real effects behind DownloadFlowDeps (lib/commerce/download-flow.ts) —
// built on the shared fetch/parse/catch in lib/client-action.ts instead of
// each repeating it.

export type DownloadEffectResult = { ok: true; url: string } | { ok: false; error: string };

export async function requestDownloadEffect(
  fetchImpl: typeof fetch,
  componentId: string
): Promise<DownloadEffectResult> {
  const result = await runClientAction<{ url: string }>(
    fetchImpl,
    `/api/components/${componentId}/download`,
    { method: "POST" },
    { fallback: "Could not prepare download.", network: "Network error — the download could not be prepared." }
  );
  if (!result.ok) return result;
  return { ok: true, url: result.data.url };
}

export async function requestCheckoutEffect(
  fetchImpl: typeof fetch,
  componentId: string,
  withdrawalWaived: boolean
): Promise<DownloadEffectResult> {
  const result = await runClientAction<{ url: string }>(
    fetchImpl,
    "/api/checkout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId, withdrawalWaived }),
    },
    { fallback: "Could not start checkout.", network: "Network error — checkout could not be started." }
  );
  if (!result.ok) return result;
  return { ok: true, url: result.data.url };
}
