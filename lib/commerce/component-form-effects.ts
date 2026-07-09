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
// same rule every *Db port in lib/ already follows.

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
  const res = await fetchImpl("/api/components/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ size: sizeBytes }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error ?? "Could not start upload." };
  return { ok: true, path: json.path, token: json.token, bucket: json.bucket };
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
  const res = await fetchImpl("/api/components", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error ?? "Could not publish." };
  return { ok: true, id: json.id };
}

// Save edits to an existing component.
export async function updateComponentEffect(
  fetchImpl: typeof fetch,
  id: string,
  payload: UpdateComponentPayload
): Promise<UpdateComponentClientResult> {
  const res = await fetchImpl(`/api/components/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error ?? "Could not save changes." };
  return { ok: true, id: json.id };
}
