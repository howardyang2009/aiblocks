import Link from "next/link";
import { AssemblyGrid } from "@/components/brand/assembly-grid";

const ECOSYSTEMS = ["claude", "chatgpt", "gemini", "deepseek", "and more"];

const PRINCIPLES: [string, string][] = [
  ["Open submission", "Anyone can publish. No manual curation or gatekeeping by the platform."],
  ["Community-driven quality", "Stars, downloads, and verified-buyer reviews surface what's actually good."],
  ["0% platform fee at launch", "Paid downloads route straight to the seller via Stripe Connect."],
  ["Hard paywall, honest pricing", "Buyers pay before downloading a paid component — no partial previews to game."],
  ["Always the latest version", "No version sprawl. Sellers update their listing in place; changelog lives in the README."],
  ["Profiles, not storefronts", "Seller pages are modeled on GitHub — bio, stats, and a grid of what they've shipped."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-shell px-5">
      {/* Hero — mirrors the homepage's visual language */}
      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-20">
        <div>
          <p className="eyebrow">AiBlocks</p>
          <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl mt-4 leading-[1.05]">
            npm for AI components.
          </h1>
          <p className="mt-5 text-muted max-w-md leading-relaxed">
            AI development produces a lot of reusable work — prompts that took
            an afternoon to get right, agents tuned through trial and error,
            MCP servers wired to real APIs, hooks and CLAUDE.md configs that
            encode hard-won conventions. Most of it never leaves the repo it
            was built in. AiBlocks is where it does.
          </p>
        </div>
        <div className="rounded-block border bg-surface p-6">
          <AssemblyGrid />
          <p className="eyebrow mt-5">Publish once. Reused everywhere.</p>
        </div>
      </section>

      {/* What we mean by "component" */}
      <section className="py-12 border-t max-w-2xl">
        <p className="eyebrow">What's a component</p>
        <h2 className="font-display font-bold text-2xl mt-2">
          Any reusable building block, in any AI ecosystem.
        </h2>
        <p className="mt-4 text-muted leading-relaxed">
          A component can be a use-case prompt, a reusable skill, an agent, a
          hook, a CLAUDE.md configuration, an MCP server — or something that
          doesn't fit neatly into any of those categories yet. If it's a
          building block someone else could snap into their own AI workflow,
          it belongs on AiBlocks.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ECOSYSTEMS.map((e) => (
            <span key={e} className="font-mono text-xs rounded-[3px] border px-2 py-1 text-subtle">
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Two flows: buyer / seller, side by side */}
      <section className="py-12 border-t">
        <p className="eyebrow">How it works</p>
        <div className="grid sm:grid-cols-2 gap-10 mt-4">
          <div>
            <h3 className="font-display font-semibold text-lg">If you're building</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal pl-4">
              <li>Sign up and connect Stripe (only needed to sell paid components).</li>
              <li>Upload a zip, write a README, tag it by ecosystem and topic.</li>
              <li>Set a price — or make it free.</li>
              <li>Get paid directly. Update the listing in place as it improves.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">If you're looking</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal pl-4">
              <li>Search or filter by tag and ecosystem.</li>
              <li>Read the README, check stars, downloads, and reviews.</li>
              <li>Download free components instantly, or pay for the rest.</li>
              <li>Re-download anytime from your dashboard.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Principles — the real decisions behind the platform */}
      <section className="py-12 border-t">
        <p className="eyebrow">How AiBlocks is built</p>
        <h2 className="font-display font-bold text-2xl mt-2">A few decisions we made on purpose</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {PRINCIPLES.map(([h, b]) => (
            <div key={h}>
              <h3 className="font-display font-medium text-base">{h}</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A note on how AiBlocks itself was built */}
      <section className="py-12 border-t max-w-2xl">
        <p className="eyebrow">Built in the open</p>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          AiBlocks was built with AI assistance from Claude, alongside the
          product decisions, review, and accountability that stayed
          human-led throughout — vision, pricing model, and everything that
          ships under the AiBlocks name. It felt right for a marketplace
          about AI-assisted building to be transparent about how it itself
          was built.
        </p>
      </section>

      {/* CTA */}
      <section className="py-16 border-t flex flex-wrap gap-3">
        <Link href="/browse" className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
          Browse components
        </Link>
        <Link href="/dashboard/seller/new" className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
          Publish yours
        </Link>
      </section>
    </div>
  );
}
