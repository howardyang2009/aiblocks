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

// Same rules as parsePublishInput/parseEditInput (lib/commerce/components-write.ts),
// reused, not reimplemented, so client and server can't drift apart again.
// The rules both forms share, in the order the Seller sees them; `zipError`
// is the one rule that differs between publish and edit.
function validateFields(
  fields: { name: string; description: string; price: string },
  zipError: string | null
): { ok: true } | { ok: false; error: string } {
  const price = parseComponentPrice(fields.price);
  const error =
    validateComponentName(fields.name) ??
    validateComponentDescription(fields.description) ??
    zipError ??
    (price.ok ? null : price.error);
  return error ? { ok: false, error } : { ok: true };
}

export function validatePublishForm(fields: PublishFormFields): PublishFormValidation {
  const zipError = !fields.file ? "zipRequired" : exceedsZipSizeLimit(fields.file.size) ? "zipTooLarge" : null;
  return validateFields(fields, zipError);
}

/** The Translation fields a Seller changed on the edit page of one Locale (#71). */
export type TranslationChanges = { locale: Locale; texts: { description?: string; readme?: string } };

/**
 * What the edit page loaded for a Locale other than the source language:
 * the Source text it must not touch, and the Translation it showed.
 */
export type TranslationContext = {
  locale: Locale;
  source: { description: string; readme: string };
  loaded: { description: string; readme: string };
};

// Same field set as PublishFormFields, with two differences: `file` is
// OPTIONAL (`null` keeps the current zip), and on a Translation tab
// `translation` carries what the page loaded. description/readme are always
// exactly what is in the form; planEditSave decides what they mean.
export type EditFormFields = PublishFormFields & { translation?: TranslationContext };

export type EditSavePlan = {
  source: { description: string; readme: string };
  translation: TranslationChanges | null;
};

/**
 * The one rule for what an edit saves (#71):
 *   - on the source-language tab, the form holds the Source text;
 *   - on a Translation tab, the Source text is kept and only the changed
 *     Translation fields are saved, as hand Translations;
 *   - on a Translation tab whose Locale the Seller just declared the source
 *     language, the form's text becomes the Source text, so nothing the
 *     Seller typed is dropped.
 */
export function planEditSave(fields: EditFormFields): EditSavePlan {
  const formText = { description: fields.description, readme: fields.readme };
  const context = fields.translation;
  if (!context || context.locale === fields.sourceLanguage) return { source: formText, translation: null };
  const texts = changedTranslation(context.loaded, formText);
  return {
    source: context.source,
    translation: Object.keys(texts).length ? { locale: context.locale, texts } : null,
  };
}

export type EditFormValidation = { ok: true } | { ok: false; error: string };

// No file is fine (keep the current zip); a new file still has the size cap.
// A translated description is held to the same rule as the Source text.
export function validateEditForm(fields: EditFormFields): EditFormValidation {
  const plan = planEditSave(fields);
  const translated = plan.translation?.texts.description;
  const translatedError = translated === undefined ? null : validateComponentDescription(translated);
  if (translatedError) return { ok: false, error: translatedError };

  const zipError = fields.file && exceedsZipSizeLimit(fields.file.size) ? "zipTooLarge" : null;
  return validateFields({ ...fields, description: plan.source.description }, zipError);
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
  const plan = planEditSave(fields);

  let zipPath: string | undefined;
  if (fields.file) {
    const uploaded = await uploadZipIfNeeded(deps, fields.file);
    if (!uploaded.ok) return { status: "error", error: uploaded.error };
    zipPath = uploaded.zipPath;
  }

  deps.onStage?.("saving");
  const updated = await deps.updateComponent(componentId, {
    name: fields.name.trim(),
    description: plan.source.description.trim(),
    readme: plan.source.readme,
    ecosystems: fields.ecosystems,
    tags: fields.tags,
    price: fields.price,
    sourceLanguage: fields.sourceLanguage,
    ...(zipPath ? { zipPath } : {}),
  });
  if (!updated.ok) return { status: "error", error: updated.error };

  if (plan.translation) {
    const saved = await deps.saveTranslation(componentId, { locale: plan.translation.locale, ...plan.translation.texts });
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
