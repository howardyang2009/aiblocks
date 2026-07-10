import { runClientAction } from "@/lib/client-action";
import type {
  RequestUploadUrlResult,
  UploadZipResult,
  CreateComponentPayload,
  CreateComponentResult,
  UpdateComponentPayload,
  UpdateComponentClientResult,
} from "@/lib/commerce/component-form-flow";

// The real effects behind PublishFlowDeps/EditFlowDeps (lib/commerce/component-form-flow.ts)
// — the actual fetch calls and Storage upload the tested flow logic calls
// through. `fetch`/the storage client are ACCEPTED, not created internally,
// so tests can hand these a fake directly instead of mocking a module — the
// same rule every *Db port in lib/ already follows. The fetch-based effects
// go through lib/client-action.ts so a dropped connection mid-publish/edit
// surfaces as an error message instead of an unhandled rejection.

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
    { fallback: "Could not start upload.", network: "Network error — the upload could not be started." }
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
  if (error) return { ok: false, error: "Upload failed. Please try again." };
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
    { fallback: "Could not publish.", network: "Network error — the component was not published." }
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
    { fallback: "Could not save changes.", network: "Network error — the changes were not saved." }
  );
  if (!result.ok) return result;
  return { ok: true, id: result.data.id };
}
