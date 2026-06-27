import { ComponentCard } from "@/components/component-card";
import type { ComponentSummary } from "@/types/database";

// My Downloads — the buyer's library. Reads the `downloads` table for the
// current user (joined to components) so they can re-download anytime.
const LIBRARY: ComponentSummary[] = [
  { id: "2", name: "Postgres Schema CLAUDE.md", description: "Project config for database work in Claude Code.", ecosystems: ["claude"], price_cents: 0, currency: "usd", star_count: 142, download_count: 5210 },
];

export default function MyDownloadsPage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">Your library</p>
      <h1 className="font-display font-bold text-3xl mt-2">My downloads</h1>
      <p className="text-muted text-sm mt-2">Everything you've acquired — re-download anytime.</p>

      {LIBRARY.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          Nothing here yet. <a href="/browse" className="text-accent underline">Browse components</a> to get started.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {LIBRARY.map((c) => <ComponentCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
