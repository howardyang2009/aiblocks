"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Spinner } from "@/components/ui/spinner";
import {
  runPublishFlow,
  runEditFlow,
  type PublishFlowDeps,
  type EditFlowDeps,
  type FormFlowStage,
} from "@/lib/commerce/component-form-flow";
import {
  requestUploadUrl,
  uploadZip,
  createComponentEffect,
  updateComponentEffect,
} from "@/lib/commerce/component-form-effects";
import { isComponentWriteError } from "@/lib/commerce/component-write-errors";
import { useErrorMessage } from "@/lib/use-error-message";

// PublishForm and EditForm — the two things a Seller does to submit a
// Component — share one interactive form (IntakeForm) and one upload
// mechanism. The two stay separate exported components (not one component
// keyed by a `mode` prop callers must branch on) because what happens
// around the form differs per verb: publish swaps to an inline "published!"
// card and offers "publish another"; edit redirects to the live listing.
// IntakeForm only knows it should call `onDone` when the flow succeeds.

type Mode = "create" | "update";
type Status = "idle" | "uploading" | "saving" | "done" | "error";

export type ComponentFormInitial = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  currentZipPath: string | null;
};


// Real wiring: injects the true `fetch`/browser Supabase client into the
// tested effect functions, rather than each flow's deps constructing them
// internally — see lib/commerce/component-form-effects.ts.
const publishDeps: Omit<PublishFlowDeps, "onStage"> = {
  requestUploadUrl: (sizeBytes) => requestUploadUrl(fetch, sizeBytes),
  uploadZip: (bucket, path, token, file) => uploadZip(createBrowserClient(), bucket, path, token, file),
  createComponent: (payload) => createComponentEffect(fetch, payload),
};

const editDeps: Omit<EditFlowDeps, "onStage"> = {
  requestUploadUrl: (sizeBytes) => requestUploadUrl(fetch, sizeBytes),
  uploadZip: (bucket, path, token, file) => uploadZip(createBrowserClient(), bucket, path, token, file),
  updateComponent: (id, payload) => updateComponentEffect(fetch, id, payload),
};

function IntakeForm({
  mode,
  componentId,
  initial,
  labels,
  onDone,
  onCancel,
}: {
  mode: Mode;
  componentId?: string;
  initial: ComponentFormInitial;
  labels: { idle: string; saving: string };
  onDone: (id: string, name: string) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("ComponentForm");
  const errorMessage = useErrorMessage();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [ecosystems, setEcosystems] = useState(initial.ecosystems);
  const [tags, setTags] = useState(initial.tags);
  const [price, setPrice] = useState(initial.price);
  const [readme, setReadme] = useState(initial.readme);
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = status === "uploading" || status === "saving";
  const onStage = (stage: FormFlowStage) => setStatus(stage);

  async function handleSubmit() {
    setError(null);
    const fields = { name, description, readme, ecosystems, tags, price, file };

    const result =
      mode === "create"
        ? await runPublishFlow({ ...publishDeps, onStage }, fields)
        : await runEditFlow({ ...editDeps, onStage }, componentId as string, fields);

    if (result.status === "error") {
      setStatus("error");
      setError(isComponentWriteError(result.error) ? t(`errors.${result.error}`) : errorMessage(result.error));
      return;
    }

    setStatus("done");
    onDone(result.id, name);
  }

  const buttonLabel =
    status === "uploading" ? t("uploading") : status === "saving" ? labels.saving : labels.idle;

  const zipFieldLabel =
    mode === "create" ? t("zip") : t("replaceZip");

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-8">
      {/* ---- Form ---- */}
      <div className="space-y-5">
        <Field label={t("name")}>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")} />
        </Field>

        <Field label={t("description")}>
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")} />
        </Field>

        <Field label={t("ecosystems")}>
          <input className="field" value={ecosystems} onChange={(e) => setEcosystems(e.target.value)}
            placeholder={t("ecosystemsPlaceholder")} />
        </Field>

        <Field label={t("tags")}>
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder={t("tagsPlaceholder")} />
        </Field>

        <Field label={t("price")}>
          <input className="field" inputMode="decimal" value={price}
            onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </Field>

        <Field label={zipFieldLabel}>
          <input type="file" accept=".zip" className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <p className="font-mono text-xs text-subtle mt-1">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
            </p>
          ) : initial.currentZipPath ? (
            <p className="font-mono text-xs text-subtle mt-1">
              {t("currentZip", { file: initial.currentZipPath.split("/").pop() ?? "" })}
            </p>
          ) : null}
        </Field>

        <Field label={t("readme")}>
          <textarea className="field min-h-48 font-mono text-[13px]" value={readme}
            onChange={(e) => setReadme(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-accent">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={busy}
            className="rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy && <Spinner className="h-4 w-4" />}
            {buttonLabel}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      {/* ---- Live README preview ---- */}
      <div className="lg:sticky lg:top-8 h-fit">
        <p className="eyebrow mb-2">{t("preview")}</p>
        <div className="rounded-block border bg-surface p-5 min-h-48">
          {readme.trim() ? (
            <MarkdownRenderer source={readme} />
          ) : (
            <p className="text-sm text-subtle">{t("previewEmpty")}</p>
          )}
        </div>
      </div>

      <style>{`.field{width:100%;border:1px solid var(--line);background:var(--surface);border-radius:4px;padding:.55rem .75rem;font-size:.875rem}.field:focus{outline:none;border-color:var(--accent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function PublishForm() {
  const t = useTranslations("PublishPage");
  const tForm = useTranslations("ComponentForm");
  const router = useRouter();
  const [published, setPublished] = useState<{ id: string; name: string } | null>(null);

  if (published) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="eyebrow">{t("publishedEyebrow")}</p>
        <h1 className="font-display font-bold text-3xl mt-2">{t("publishedTitle", { name: published.name })}</h1>
        <p className="text-muted text-sm mt-3">{t("publishedBody")}</p>
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/components/${published.id}`)}
            className="rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors"
          >
            {t("view")}
          </button>
          <button
            onClick={() => setPublished(null)}
            className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors"
          >
            {t("publishAnother")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="font-display font-bold text-3xl mt-2">{t("title")}</h1>
      <Link href="/docs/seller/publish" className="inline-block mt-2 text-accent text-sm hover:underline">
        {t("guide")}
      </Link>

      <IntakeForm
        mode="create"
        initial={{
          name: "",
          description: "",
          readme: tForm("defaultReadme"),
          ecosystems: "",
          tags: "",
          price: "0",
          currentZipPath: null,
        }}
        labels={{ idle: t("publish"), saving: t("publishing") }}
        onDone={(id, name) => setPublished({ id, name })}
      />
    </div>
  );
}

export function EditForm({
  componentId,
  initial,
}: {
  componentId: string;
  initial: ComponentFormInitial;
}) {
  const t = useTranslations("EditPage");
  const router = useRouter();

  return (
    <IntakeForm
      mode="update"
      componentId={componentId}
      initial={initial}
      labels={{ idle: t("save"), saving: t("saving") }}
      onDone={(id) => {
        // Refresh so the detail page reflects the new values, then send the
        // seller to their live listing.
        router.refresh();
        router.push(`/components/${id}`);
      }}
      onCancel={() => router.push(`/components/${componentId}`)}
    />
  );
}
