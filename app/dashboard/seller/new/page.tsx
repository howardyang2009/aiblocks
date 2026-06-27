"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ZIP_BUCKET, MAX_ZIP_BYTES } from "@/lib/constants";

type Status = "idle" | "uploading" | "saving" | "done" | "error";

export default function PublishPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ecosystems, setEcosystems] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("0");
  const [readme, setReadme] = useState("# Overview\n\nWhat it does, how to install…");
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const busy = status === "uploading" || status === "saving";

  async function handlePublish() {
    setError(null);

    if (name.trim().length < 3) return setError("Name must be at least 3 characters.");
    if (description.trim().length < 10) return setError("Add a short description (10+ characters).");
    if (!file) return setError("Choose a zip file to upload.");
    if (file.size > MAX_ZIP_BYTES) return setError("Zip exceeds the 10MB limit.");

    try {
      // 1. Ask the server for a one-time signed upload URL.
      setStatus("uploading");
      const urlRes = await fetch("/api/components/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: file.size }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error ?? "Could not start upload.");

      // 2. Upload the zip DIRECTLY to Supabase Storage.
      const supabase = createBrowserClient();
      const { error: upErr } = await supabase.storage
        .from(ZIP_BUCKET)
        .uploadToSignedUrl(urlJson.path, urlJson.token, file);
      if (upErr) throw new Error("Upload failed. Please try again.");

      // 3. Create the component record (metadata + the uploaded zip path).
      setStatus("saving");
      const createRes = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          readme,
          ecosystems: ecosystems.split(",").map((s) => s.trim()).filter(Boolean),
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          price,
          zipPath: urlJson.path,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? "Could not publish.");

      setPublishedId(createJson.id);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Something went wrong.");
    }
  }

  if (status === "done" && publishedId) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="eyebrow">Published</p>
        <h1 className="font-display font-bold text-3xl mt-2">{name} is live</h1>
        <p className="text-muted text-sm mt-3">Your component is now in the catalog.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/components/${publishedId}`)}
            className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            View component
          </button>
          <button
            onClick={() => {
              setStatus("idle");
              setName(""); setDescription(""); setEcosystems(""); setTags("");
              setPrice("0"); setReadme("# Overview\n\n"); setFile(null); setPublishedId(null);
            }}
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

          <Field label="Component zip (max 10MB)">
            <input type="file" accept=".zip" className="text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="font-mono text-xs text-subtle mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB</p>}
          </Field>

          <Field label="README (markdown)">
            <textarea className="field min-h-48 font-mono text-[13px]" value={readme}
              onChange={(e) => setReadme(e.target.value)} />
          </Field>

          {error && <p className="text-sm text-accent">{error}</p>}

          <button onClick={handlePublish} disabled={busy}
            className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
            {status === "uploading" ? "Uploading…" : status === "saving" ? "Publishing…" : "Publish"}
          </button>
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
