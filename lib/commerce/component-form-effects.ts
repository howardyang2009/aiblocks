import { runClientAction } from "@/lib/client-action";
import type {
  RequestUploadUrlResult,
  UploadZipResult,
  CreateComponentPayload,
  CreateComponentResult,
  UpdateComponentPayload,
  UpdateComponentClientResult,
  SaveTranslationPayload,
  TranslationActionResult,
} from "@/lib/commerce/component-form-flow";
import type { Locale } from "@/i18n/routing";
import type { TranslatedField } from "@/lib/translation/plan";

// The real effects behind PublishFlowDeps/EditFlowDeps (lib/commerce/component-form-flow.ts)
// — the actual fetch calls and Storage upload the tested flow logic calls
// through. `fetch`/the storage client are ACCEPTED, not created internally,
// so tests can hand these a fake directly instead of mocking a module — the
// same rule every *Db port in lib/ already follows. The fetch-based effects
// go through lib/client-action.ts so a dropped connection mid-publish/edit
// surfaces as an error message instead of an unhandled rejection. Every
// failure is a ComponentWriteError key (lib/commerce/component-write-errors.ts),
// which the form translates.

// The narrow slice of the Supabase client uploadZip touches.
export type UploadZipStorage = {
  storage: {
    from(bucket: string): {
      uploadToSignedUrl(
        path: string,
        token: string,
        file: File
      ): Promise<{ error: { message: string } | null }>;
    };
  };
};

// Mint a signed upload URL for a zip about to be uploaded from the browser.
export async function requestUploadUrl(
  fetchImpl: typeof fetch,
  sizeBytes: number
): Promise<RequestUploadUrlResult> {
  const result = await runClientAction<{ path: string; token: string; bucket: string }>(
    fetchImpl,
    "/api/components/upload-url",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: sizeBytes }) },
    { fallback: "uploadStartFailed", network: "uploadStartNetwork" }
  );
  if (!result.ok) return result;
  return { ok: true, path: result.data.path, token: result.data.token, bucket: result.data.bucket };
}

// Upload the zip directly to Storage using the signed URL minted above.
export async function uploadZip(
  storage: UploadZipStorage,
  bucket: string,
  path: string,
  token: string,
  file: File
): Promise<UploadZipResult> {
  const { error } = await storage.storage.from(bucket).uploadToSignedUrl(path, token, file);
  if (error) return { ok: false, error: "uploadFailed" };
  return { ok: true };
}

// Create the component row once the zip (if any) is in place.
export async function createComponentEffect(
  fetchImpl: typeof fetch,
  payload: CreateComponentPayload
): Promise<CreateComponentResult> {
  const result = await runClientAction<{ id: string }>(
    fetchImpl,
    "/api/components",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    { fallback: "publishFailed", network: "publishNetwork" }
  );
  if (!result.ok) return result;
  return { ok: true, id: result.data.id };
}

// Save edits to an existing component.
export async function updateComponentEffect(
  fetchImpl: typeof fetch,
  id: string,
  payload: UpdateComponentPayload
): Promise<UpdateComponentClientResult> {
  const result = await runClientAction<{ id: string }>(
    fetchImpl,
    `/api/components/${id}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    { fallback: "saveFailed", network: "saveNetwork" }
  );
  if (!result.ok) return result;
  return { ok: true, id: result.data.id };
}

// The Translation actions on the edit page (#71) answer with no payload.
async function translationAction(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  fallback: "translationSaveFailed" | "translationActionFailed"
): Promise<TranslationActionResult> {
  const result = await runClientAction(fetchImpl, url, init, { fallback, network: "translationNetwork" });
  return result.ok ? { ok: true } : result;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Save the Seller's own Translation of one Locale: only changed fields.
export function saveTranslationEffect(fetchImpl: typeof fetch, id: string, payload: SaveTranslationPayload) {
  return translationAction(fetchImpl, `/api/components/${id}/translations`, json("PUT", payload), "translationSaveFailed");
}

// Discard a hand edit and queue a fresh machine Translation of that field.
export function resetTranslationEffect(
  fetchImpl: typeof fetch,
  id: string,
  target: { locale: Locale; field: TranslatedField }
) {
  return translationAction(fetchImpl, `/api/components/${id}/translations/reset`, json("POST", target), "translationActionFailed");
}

// Redo the Component's failed machine Translations.
export function retryTranslationsEffect(fetchImpl: typeof fetch, id: string) {
  return translationAction(fetchImpl, `/api/components/${id}/translations/retry`, { method: "POST" }, "translationActionFailed");
}
