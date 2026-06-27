"use client";

import { useState } from "react";

// Publish Component. Posts to /api/components (multipart for the zip).
// This is a first-draft form — wire it up and add validation next.
export default function PublishPage() {
  const [price, setPrice] = useState("");

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <p className="eyebrow">Seller</p>
      <h1 className="font-display font-bold text-3xl mt-2">Publish a component</h1>

      <div className="mt-8 space-y-5">
        <Field label="Name">
          <input className="field" placeholder="Email Triage Agent" />
        </Field>

        <Field label="Short description">
          <input className="field" placeholder="One line buyers see on the card" />
        </Field>

        <Field label="Ecosystems">
          <input className="field" placeholder="claude, gpt, gemini" />
        </Field>

        <Field label="Tags">
          <input className="field" placeholder="agent, email, productivity (free-form)" />
        </Field>

        <Field label="Price (USD, leave 0 for free)">
          <input
            className="field"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
          />
        </Field>

        <Field label="README (markdown)">
          <textarea className="field min-h-40" placeholder="# Title&#10;What it does, how to install…" />
        </Field>

        <Field label="Component zip (max 10MB)">
          <input type="file" accept=".zip" className="text-sm" />
        </Field>

        <button className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
          Publish
        </button>
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
