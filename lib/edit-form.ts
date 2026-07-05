import { exceedsZipSizeLimit } from "@/lib/constants";
import { validatePublishName, validatePublishDescription, parsePublishPrice } from "@/lib/publish";
import type {
  RequestUploadUrlResult,
  UploadZipResult,
} from "@/lib/publish-form";

// Same field set as PublishFormFields, with one difference: `file` is
// OPTIONAL. `null` means "keep the current zip" — the seller may edit
// only metadata without re-uploading.
export type EditFormFields = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  file: File | null;
};

export type EditFormValidation = { ok: true } | { ok: false; error: string };

// Same rules as parseEditInput (lib/edit.ts) — reused, not reimplemented,
// so client and server can't drift apart. Difference from the publish form:
// no file is fine (that's the "keep current zip" case); when a file IS
// provided, the 10MB cap still applies.
export function validateEditForm(fields: EditFormFields): EditFormValidation {
  const nameError = validatePublishName(fields.name);
  if (nameError) return { ok: false, error: nameError };

  const descriptionError = validatePublishDescription(fields.description);
  if (descriptionError) return { ok: false, error: descriptionError };

  if (fields.file && exceedsZipSizeLimit(fields.file.size)) {
    return { ok: false, error: "Zip exceeds the 10MB limit." };
  }

  const price = parsePublishPrice(fields.price);
  if (!price.ok) return { ok: false, error: price.error };

  return { ok: true };
}

export type UpdateComponentPayload = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  // Omitted when the seller kept the existing zip; a string when they
  // uploaded a replacement.
  zipPath?: string;
};

export type UpdateComponentClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type EditFlowStage = "uploading" | "saving";

// Narrow effect ports mirror publish-form.ts. `updateComponent` takes the
// component id up-front because the flow itself doesn't need to know
// where it came from — the page provides it once.
export type EditFlowDeps = {
  requestUploadUrl: (sizeBytes: number) => Promise<RequestUploadUrlResult>;
  uploadZip: (bucket: string, path: string, token: string, file: File) => Promise<UploadZipResult>;
  updateComponent: (id: string, payload: UpdateComponentPayload) => Promise<UpdateComponentClientResult>;
  onStage?: (stage: EditFlowStage) => void;
};

export type EditFlowResult = { status: "error"; error: string } | { status: "done"; id: string };

// Validate → (optional) upload → update. When there's no new file, the
// upload steps (and the "uploading" stage) are skipped entirely — server
// receives no zipPath and keeps the existing one. Same short-circuit and
// stage-reporting shape as runPublishFlow so a shared test harness reads
// naturally.
export async function runEditFlow(
  deps: EditFlowDeps,
  componentId: string,
  fields: EditFormFields
): Promise<EditFlowResult> {
  const validation = validateEditForm(fields);
  if (!validation.ok) return { status: "error", error: validation.error };

  let zipPath: string | undefined;

  if (fields.file) {
    const file = fields.file;
    deps.onStage?.("uploading");
    const urlResult = await deps.requestUploadUrl(file.size);
    if (!urlResult.ok) return { status: "error", error: urlResult.error };

    const uploaded = await deps.uploadZip(urlResult.bucket, urlResult.path, urlResult.token, file);
    if (!uploaded.ok) return { status: "error", error: uploaded.error };

    zipPath = urlResult.path;
  }

  deps.onStage?.("saving");
  const updated = await deps.updateComponent(componentId, {
    name: fields.name.trim(),
    description: fields.description.trim(),
    readme: fields.readme,
    ecosystems: fields.ecosystems,
    tags: fields.tags,
    price: fields.price,
    ...(zipPath ? { zipPath } : {}),
  });
  if (!updated.ok) return { status: "error", error: updated.error };

  return { status: "done", id: updated.id };
}
