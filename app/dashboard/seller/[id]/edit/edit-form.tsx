"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { runEditFlow, type EditFlowDeps } from "@/lib/edit-form";

type Status = "idle" | "uploading" | "saving" | "done" | "error";

const deps: Omit<EditFlowDeps, "onStage"> = {
  async requestUploadUrl(sizeBytes) {
    const res = await fetch("/api/components/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: sizeBytes }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? "Could not start upload." };
    return { ok: true, path: json.path, token: json.token, bucket: json.bucket };
  },
  async uploadZip(bucket, path, token, file) {
    const supabase = createBrowserClient();
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file);
    if (error) return { ok: false, error: "Upload failed. Please try again." };
    return { ok: true };
  },
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

export type EditFormInitial = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string;
  tags: string;
  price: string;
  currentZipPath: string | null;
};

export function EditComponentForm({
  componentId,
  initial,
}: {
  componentId: string;
  initial: EditFormInitial;
}) {
  const router = useRouter();

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

  async function handleSave() {
    setError(null);

    const result = await runEditFlow(
      { ...deps, onStage: setStatus },
      componentId,
      { name, description, readme, ecosystems, tags, price, file }
    );

    if (result.status === "error") {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("done");
    // Refresh so the detail page reflects the new values, then send the
    // seller to their live listing.
    router.refresh();
    router.push(`/components/${result.id}`);
  }

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

        <Field label="Replace zip (optional — leave empty to keep current)">
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
          <button onClick={handleSave} disabled={busy}
            className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
            {status === "uploading" ? "Uploading…" : status === "saving" ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={() => router.push(`/components/${componentId}`)}
            disabled={busy}
            className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
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
