import { exceedsZipSizeLimit } from "@/lib/constants";
import { validateComponentName, validateComponentDescription, parseComponentPrice } from "@/lib/commerce/components-write";
import type { Locale } from "@/i18n/routing";
import type { SourceLanguage } from "@/lib/translation/source-language";

// The publish and edit client flows — validate, (conditionally) upload,
// save — as one module. Kept as two exported flows (runPublishFlow /
// runEditFlow) because callers reach for a specific verb and the two
// really do differ (edit's file is optional, its save call takes a
// componentId up front); the upload-then-report-stage step underneath is
// byte-identical, so that's the one part pulled into a shared helper.

export type PublishFormFields = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  sourceLanguage: SourceLanguage;
  file: File | null;
};

export type PublishFormValidation = { ok: true } | { ok: false; error: string };

// Same rules as parsePublishInput (lib/commerce/components-write.ts) — reused, not
// reimplemented, so client and server can't drift apart again.
export function validatePublishForm(fields: PublishFormFields): PublishFormValidation {
  const nameError = validateComponentName(fields.name);
  if (nameError) return { ok: false, error: nameError };

  const descriptionError = validateComponentDescription(fields.description);
  if (descriptionError) return { ok: false, error: descriptionError };

  if (!fields.file) return { ok: false, error: "zipRequired" };
  if (exceedsZipSizeLimit(fields.file.size)) {
    return { ok: false, error: "zipTooLarge" };
  }

  const price = parseComponentPrice(fields.price);
  if (!price.ok) return { ok: false, error: price.error };

  return { ok: true };
}

/** The Translation fields a Seller changed on the edit page of one Locale (#71). */
export type TranslationChanges = { locale: Locale; texts: { description?: string; readme?: string } };

// Same field set as PublishFormFields, with two differences: `file` is
// OPTIONAL — `null` means "keep the current zip", so the seller may edit
// only metadata without re-uploading — and on a Locale other than the
// source language `translation` carries the changed Translation fields,
// while description/readme carry the unchanged Source text.
export type EditFormFields = PublishFormFields & { translation?: TranslationChanges };

export type EditFormValidation = { ok: true } | { ok: false; error: string };

// Same rules as parseEditInput (lib/commerce/components-write.ts) — reused, not
// reimplemented, so client and server can't drift apart. Difference from
// the publish form: no file is fine (that's the "keep current zip" case);
// when a file IS provided, the 10MB cap still applies.
export function validateEditForm(fields: EditFormFields): EditFormValidation {
  const nameError = validateComponentName(fields.name);
  if (nameError) return { ok: false, error: nameError };

  const descriptionError = validateComponentDescription(fields.description);
  if (descriptionError) return { ok: false, error: descriptionError };

  const translated = fields.translation?.texts.description;
  const translatedError = translated === undefined ? null : validateComponentDescription(translated);
  if (translatedError) return { ok: false, error: translatedError };

  if (fields.file && exceedsZipSizeLimit(fields.file.size)) {
    return { ok: false, error: "zipTooLarge" };
  }

  const price = parseComponentPrice(fields.price);
  if (!price.ok) return { ok: false, error: price.error };

  return { ok: true };
}

export type RequestUploadUrlResult =
  | { ok: true; path: string; token: string; bucket: string }
  | { ok: false; error: string };

export type UploadZipResult = { ok: true } | { ok: false; error: string };

export type FormFlowStage = "uploading" | "saving";

// The narrow set of effects shared by both flows to get a zip into storage —
// HTTP + storage upload in production, fakes in tests.
type UploadDeps = {
  requestUploadUrl: (sizeBytes: number) => Promise<RequestUploadUrlResult>;
  uploadZip: (bucket: string, path: string, token: string, file: File) => Promise<UploadZipResult>;
  onStage?: (stage: FormFlowStage) => void;
};

type UploadOutcome = { ok: true; zipPath: string } | { ok: false; error: string };

// Mint a signed upload URL, then upload to it — the one step that was
// byte-identical between publish (always runs this) and edit (runs it only
// when a replacement file is provided). Reports the "uploading" stage.
async function uploadZipIfNeeded(deps: UploadDeps, file: File): Promise<UploadOutcome> {
  deps.onStage?.("uploading");
  const urlResult = await deps.requestUploadUrl(file.size);
  if (!urlResult.ok) return { ok: false, error: urlResult.error };

  const uploaded = await deps.uploadZip(urlResult.bucket, urlResult.path, urlResult.token, file);
  if (!uploaded.ok) return { ok: false, error: uploaded.error };

  return { ok: true, zipPath: urlResult.path };
}

export type CreateComponentPayload = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  sourceLanguage: SourceLanguage;
  zipPath: string;
};

export type CreateComponentResult = { ok: true; id: string } | { ok: false; error: string };

// The narrow set of effects the publish flow needs.
export type PublishFlowDeps = UploadDeps & {
  createComponent: (payload: CreateComponentPayload) => Promise<CreateComponentResult>;
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

  const uploaded = await uploadZipIfNeeded(deps, fields.file as File);
  if (!uploaded.ok) return { status: "error", error: uploaded.error };

  deps.onStage?.("saving");
  const created = await deps.createComponent({
    name: fields.name.trim(),
    description: fields.description.trim(),
    readme: fields.readme,
    ecosystems: fields.ecosystems,
    tags: fields.tags,
    price: fields.price,
    sourceLanguage: fields.sourceLanguage,
    zipPath: uploaded.zipPath,
  });
  if (!created.ok) return { status: "error", error: created.error };

  return { status: "done", id: created.id };
}

export type UpdateComponentPayload = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  sourceLanguage: SourceLanguage;
  // Omitted when the seller kept the existing zip; a string when they
  // uploaded a replacement.
  zipPath?: string;
};

export type UpdateComponentClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// The narrow set of effects the edit flow needs. `updateComponent` takes
// the component id up front because the flow itself doesn't need to know
// where it came from — the page provides it once.
export type SaveTranslationPayload = { locale: Locale } & TranslationChanges["texts"];

export type TranslationActionResult = { ok: true } | { ok: false; error: string };

export type EditFlowDeps = UploadDeps & {
  updateComponent: (id: string, payload: UpdateComponentPayload) => Promise<UpdateComponentClientResult>;
  saveTranslation: (id: string, payload: SaveTranslationPayload) => Promise<TranslationActionResult>;
};

export type EditFlowResult = { status: "error"; error: string } | { status: "done"; id: string };

// Validate → (optional) upload → update → (optional) save the Translation.
// When there's no new file, the upload step (and the "uploading" stage) is
// skipped entirely — server receives no zipPath and keeps the existing one.
export async function runEditFlow(
  deps: EditFlowDeps,
  componentId: string,
  fields: EditFormFields
): Promise<EditFlowResult> {
  const validation = validateEditForm(fields);
  if (!validation.ok) return { status: "error", error: validation.error };

  let zipPath: string | undefined;
  if (fields.file) {
    const uploaded = await uploadZipIfNeeded(deps, fields.file);
    if (!uploaded.ok) return { status: "error", error: uploaded.error };
    zipPath = uploaded.zipPath;
  }

  deps.onStage?.("saving");
  const updated = await deps.updateComponent(componentId, {
    name: fields.name.trim(),
    description: fields.description.trim(),
    readme: fields.readme,
    ecosystems: fields.ecosystems,
    tags: fields.tags,
    price: fields.price,
    sourceLanguage: fields.sourceLanguage,
    ...(zipPath ? { zipPath } : {}),
  });
  if (!updated.ok) return { status: "error", error: updated.error };

  // Once this Locale is declared the source language, the text in the form
  // is no longer a Translation of anything: only the shared fields save.
  const translation = fields.translation;
  if (translation && translation.locale !== fields.sourceLanguage && Object.keys(translation.texts).length) {
    const saved = await deps.saveTranslation(componentId, { locale: translation.locale, ...translation.texts });
    if (!saved.ok) return { status: "error", error: saved.error };
  }

  return { status: "done", id: updated.id };
}

/**
 * The Translation fields the Seller changed and left non-empty, compared
 * with the text the edit page loaded. Only these are saved, and saving one
 * makes it a hand Translation (#71).
 */
export function changedTranslation(
  current: { description: string; readme: string },
  edited: { description: string; readme: string }
): TranslationChanges["texts"] {
  const texts: TranslationChanges["texts"] = {};
  const description = edited.description.trim();
  if (description && description !== current.description) texts.description = description;
  if (edited.readme.trim() && edited.readme !== current.readme) texts.readme = edited.readme;
  return texts;
}
