"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  runPublishFlow,
  runEditFlow,
  type PublishFlowDeps,
  type EditFlowDeps,
  type FormFlowStage,
} from "@/lib/component-form-flow";

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

const BLANK_INITIAL: ComponentFormInitial = {
  name: "",
  description: "",
  readme: "# Overview\n\nWhat it does, how to install…",
  ecosystems: "",
  tags: "",
  price: "0",
  currentZipPath: null,
};

const uploadDeps = {
  async requestUploadUrl(sizeBytes: number) {
    const res = await fetch("/api/components/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: sizeBytes }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false as const, error: json.error ?? "Could not start upload." };
    return { ok: true as const, path: json.path, token: json.token, bucket: json.bucket };
  },
  async uploadZip(bucket: string, path: string, token: string, file: File) {
    const supabase = createBrowserClient();
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file);
    if (error) return { ok: false as const, error: "Upload failed. Please try again." };
    return { ok: true as const };
  },
};

const publishDeps: Omit<PublishFlowDeps, "onStage"> = {
  ...uploadDeps,
  async createComponent(payload) {
    const res = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? "Could not publish." };
    return { ok: true, id: json.id };
  },
};

const editDeps: Omit<EditFlowDeps, "onStage"> = {
  ...uploadDeps,
  async updateComponent(id, payload) {
    const res = await fetch(`/api/components/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? "Could not save changes." };
    return { ok: true, id: json.id };
  },
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
      setError(result.error);
      return;
    }

    setStatus("done");
    onDone(result.id, name);
  }

  const buttonLabel =
    status === "uploading" ? "Uploading…" : status === "saving" ? labels.saving : labels.idle;

  const zipFieldLabel =
    mode === "create" ? "Component zip (max 10MB)" : "Replace zip (optional — leave empty to keep current)";

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-8">
      {/* ---- Form ---- */}
      <div className="space-y-5">
        <Field label="Name">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Email Triage Agent" />
        </Field>

        <Field label="Short description">
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="One line buyers see on the card" />
        </Field>

        <Field label="Ecosystems (comma separated)">
          <input className="field" value={ecosystems} onChange={(e) => setEcosystems(e.target.value)}
            placeholder="claude, gpt, gemini" />
        </Field>

        <Field label="Tags (comma separated)">
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="agent, email, productivity" />
        </Field>

        <Field label="Price in USD (0 for free)">
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
              Current: {initial.currentZipPath.split("/").pop()}
            </p>
          ) : null}
        </Field>

        <Field label="README (markdown)">
          <textarea className="field min-h-48 font-mono text-[13px]" value={readme}
            onChange={(e) => setReadme(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-accent">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={busy}
            className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
            {buttonLabel}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ---- Live README preview ---- */}
      <div className="lg:sticky lg:top-8 h-fit">
        <p className="eyebrow mb-2">Preview</p>
        <div className="rounded-block border bg-surface p-5 min-h-48">
          {readme.trim() ? (
            <MarkdownRenderer source={readme} />
          ) : (
            <p className="text-sm text-subtle">Your README preview appears here.</p>
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
  const router = useRouter();
  const [published, setPublished] = useState<{ id: string; name: string } | null>(null);

  if (published) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="eyebrow">Published</p>
        <h1 className="font-display font-bold text-3xl mt-2">{published.name} is live</h1>
        <p className="text-muted text-sm mt-3">Your component is now in the catalog.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/components/${published.id}`)}
            className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            View component
          </button>
          <button
            onClick={() => setPublished(null)}
            className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors"
          >
            Publish another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">Seller</p>
      <h1 className="font-display font-bold text-3xl mt-2">Publish a component</h1>
      <a href="/docs/seller/publish" className="inline-block mt-2 text-accent text-sm hover:underline">
        New here? Read the publishing guide →
      </a>

      <IntakeForm
        mode="create"
        initial={BLANK_INITIAL}
        labels={{ idle: "Publish", saving: "Publishing…" }}
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
  const router = useRouter();

  return (
    <IntakeForm
      mode="update"
      componentId={componentId}
      initial={initial}
      labels={{ idle: "Save changes", saving: "Saving…" }}
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
