import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { ComponentCard } from "@/components/component-card";
import { AssemblyGrid } from "@/components/brand/assembly-grid";
import type { ComponentSummary } from "@/types/database";

// Home. The hero opens with the most characteristic thing in this product's
// world: components snapping into an assembly. The grid IS the brand.
export const dynamic = "force-dynamic";

const Pimary_TAGS = ["mcp-server", "claude-md", "agent", "hook", "prompt", "skill"];

export default async function HomePage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("components")
    .select("id, name, description, ecosystems, price_cents, currency, star_count, download_count")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);
  const latest = (data ?? []) as ComponentSummary[];

  return (
    <div className="mx-auto max-w-shell px-5">
      {/* Hero */}
      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-24">
        <div>
          <p className="eyebrow">Open marketplace · multi-ecosystem</p>
          <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl mt-4 leading-[1.05]">
            Reusable AI components,<br />ready to snap in.
          </h1>
          <p className="mt-5 text-muted max-w-md">
            Publish and download AI building blocks — prompts, skills, agents, MCP
            servers, CLAUDE.md configs, hooks — for Claude, GPT, Gemini, and more.
            Free or paid, your price, your payout.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/browse" className="rounded-block bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Browse components
            </Link>
            <Link href="/dashboard/seller/new" className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
              Publish yours
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {Pimary_TAGS.map((t) => (
              <Link key={t} href={`/browse?tag=${t}`} className="font-mono text-xs rounded-[3px] border px-2 py-1 text-muted hover:border-accent">
                {t}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-block border bg-surface p-6">
          <AssemblyGrid />
          <p className="eyebrow mt-5">npm for AI components</p>
        </div>
      </section>

      {/* How it works — a real sequence, so numbering is earned */}
      <section className="py-12 border-t">
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            ["01", "Publish", "Upload a zip, write a README, set a price — or make it free."],
            ["02", "Discover", "Buyers search and filter by tag and ecosystem to find the block they need."],
            ["03", "Earn", "Paid downloads go straight to your Stripe account. 0% platform fee at launch."],
          ].map(([n, h, b]) => (
            <div key={n}>
              <span className="font-mono text-xs text-accent">{n}</span>
              <h3 className="font-display font-medium text-lg mt-2">{h}</h3>
              <p className="text-sm text-muted mt-1.5">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest components — real data */}
      {latest.length > 0 && (
        <section className="py-12 border-t">
          <div className="flex items-end justify-between">
            <h2 className="font-display font-bold text-2xl">Latest components</h2>
            <Link href="/browse" className="font-mono text-xs text-accent hover:underline">browse all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {latest.map((c) => <ComponentCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

    </div>
  );
}
