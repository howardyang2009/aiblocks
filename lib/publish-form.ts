import { exceedsZipSizeLimit } from "@/lib/constants";
import { validatePublishName, validatePublishDescription, parsePublishPrice } from "@/lib/publish";

export type PublishFormFields = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  file: File | null;
};

export type PublishFormValidation = { ok: true } | { ok: false; error: string };

// Same rules as parsePublishInput (lib/publish.ts) — reused, not
// reimplemented, so client and server can't drift apart again.
export function validatePublishForm(fields: PublishFormFields): PublishFormValidation {
  const nameError = validatePublishName(fields.name);
  if (nameError) return { ok: false, error: nameError };

  const descriptionError = validatePublishDescription(fields.description);
  if (descriptionError) return { ok: false, error: descriptionError };

  if (!fields.file) return { ok: false, error: "Choose a zip file to upload." };
  if (exceedsZipSizeLimit(fields.file.size)) {
    return { ok: false, error: "Zip exceeds the 10MB limit." };
  }

  const price = parsePublishPrice(fields.price);
  if (!price.ok) return { ok: false, error: price.error };

  return { ok: true };
}

export type RequestUploadUrlResult =
  | { ok: true; path: string; token: string; bucket: string }
  | { ok: false; error: string };

export type UploadZipResult = { ok: true } | { ok: false; error: string };

export type CreateComponentPayload = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  zipPath: string;
};

export type CreateComponentResult = { ok: true; id: string } | { ok: false; error: string };

export type PublishFlowStage = "uploading" | "saving";

// The narrow set of effects the publish flow needs — HTTP + storage upload in
// production, fakes in tests. Same seam shape as the *Db ports in lib/publish.ts.
export type PublishFlowDeps = {
  requestUploadUrl: (sizeBytes: number) => Promise<RequestUploadUrlResult>;
  uploadZip: (bucket: string, path: string, token: string, file: File) => Promise<UploadZipResult>;
  createComponent: (payload: CreateComponentPayload) => Promise<CreateComponentResult>;
  onStage?: (stage: PublishFlowStage) => void;
};

export type PublishFlowResult = { status: "error"; error: string } | { status: "done"; id: string };

// Validates the form, then runs upload-url -> upload -> create in sequence,
// short-circuiting on the first failure. Pure aside from the injected deps,
// so the whole flow — including "upload succeeds but create fails" — is
// testable without a browser.
export async function runPublishFlow(
  deps: PublishFlowDeps,
  fields: PublishFormFields
): Promise<PublishFlowResult> {
  const validation = validatePublishForm(fields);
  if (!validation.ok) return { status: "error", error: validation.error };

  const file = fields.file as File;

  deps.onStage?.("uploading");
  const urlResult = await deps.requestUploadUrl(file.size);
  if (!urlResult.ok) return { status: "error", error: urlResult.error };

  const uploaded = await deps.uploadZip(urlResult.bucket, urlResult.path, urlResult.token, file);
  if (!uploaded.ok) return { status: "error", error: uploaded.error };

  deps.onStage?.("saving");
  const created = await deps.createComponent({
    name: fields.name.trim(),
    description: fields.description.trim(),
    readme: fields.readme,
    ecosystems: fields.ecosystems,
    tags: fields.tags,
    price: fields.price,
    zipPath: urlResult.path,
  });
  if (!created.ok) return { status: "error", error: created.error };

  return { status: "done", id: created.id };
}
