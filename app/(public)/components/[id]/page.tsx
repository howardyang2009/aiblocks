import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarButton } from "@/components/star-button";
import { formatPrice } from "@/lib/utils";

// Component detail. Replace the placeholder with a Supabase fetch by params.id.
const SAMPLE_README = `# Email Triage Agent

Sorts incoming mail, applies labels, and drafts replies in your voice.

## Install
1. Download the zip
2. Drop it into your agents folder
3. Configure your inbox connector

## Changelog
- **Latest** — improved label accuracy
`;

export default function ComponentDetailPage({ params }: { params: { id: string } }) {
  const price: number = 1200;
  return (
    <div className="mx-auto max-w-shell px-5 py-10 grid lg:grid-cols-[1fr_320px] gap-10">
      <article>
        <p className="eyebrow">Component · {params.id}</p>
        <h1 className="font-display font-bold text-3xl mt-2">Email Triage Agent</h1>
        <p className="text-muted mt-2">Sorts, labels, and drafts replies to your inbox.</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {["claude", "gpt"].map((e) => (
            <span key={e} className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle">{e}</span>
          ))}
        </div>

        <hr className="my-8" />
        <MarkdownRenderer source={SAMPLE_README} />
      </article>

      <aside className="lg:sticky lg:top-8 h-fit rounded-block border bg-surface p-5">
        <p className="font-mono text-2xl">{formatPrice(price)}</p>
        <button className="mt-4 w-full rounded-block bg-ink text-paper py-2.5 text-sm font-medium hover:bg-accent transition-colors">
          {price === 0 ? "Download" : "Buy to download"}
        </button>
        <div className="mt-4">
          <StarButton componentId={params.id} initialCount={84} />
        </div>
        <dl className="mt-6 space-y-2 font-mono text-xs text-subtle">
          <div className="flex justify-between"><dt>downloads</dt><dd>1,320</dd></div>
          <div className="flex justify-between"><dt>stars</dt><dd>84</dd></div>
        </dl>
      </aside>
    </div>
  );
}
