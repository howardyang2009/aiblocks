import { ComponentCard } from "@/components/component-card";
import type { ComponentSummary } from "@/types/database";

// Browse + search. In production this reads from /api/components (full-text
// search + tag filter). Shown here with placeholder data so the page renders
// before the database is connected.
const PLACEHOLDER: ComponentSummary[] = [
  { id: "1", name: "Email Triage Agent", description: "Sorts, labels, and drafts replies to your inbox.", ecosystems: ["claude", "gpt"], price_cents: 1200, currency: "usd", star_count: 84, download_count: 1320 },
  { id: "2", name: "Postgres Schema CLAUDE.md", description: "Battle-tested project config for database work in Claude Code.", ecosystems: ["claude"], price_cents: 0, currency: "usd", star_count: 142, download_count: 5210 },
  { id: "3", name: "Web Research MCP Server", description: "Search, fetch, and summarize the web from any MCP client.", ecosystems: ["claude", "gemini"], price_cents: 2500, currency: "usd", star_count: 67, download_count: 890 },
];

export default function BrowsePage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="font-display font-bold text-3xl mt-2">Browse components</h1>
        </div>
        <input
          type="search"
          placeholder="Search components…"
          className="rounded-block border bg-surface px-4 py-2 text-sm w-full sm:w-72 focus:outline-none focus:border-accent"
        />
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {PLACEHOLDER.map((c) => (
          <ComponentCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}
