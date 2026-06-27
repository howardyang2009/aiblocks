import { ComponentCard } from "@/components/component-card";
import type { ComponentSummary } from "@/types/database";

const SAMPLE: ComponentSummary[] = [
  { id: "2", name: "Postgres Schema CLAUDE.md", description: "Project config for database work in Claude Code.", ecosystems: ["claude"], price_cents: 0, currency: "usd", star_count: 142, download_count: 5210 },
];

export default function SellerProfilePage({ params }: { params: { username: string } }) {
  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <header className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-block bg-ink" aria-hidden />
        <div>
          <h1 className="font-display font-bold text-2xl">@{params.username}</h1>
          <p className="text-muted text-sm mt-1">Builder of reusable AI blocks.</p>
        </div>
      </header>

      <div className="mt-6 flex gap-8 font-mono text-xs text-subtle">
        <span>1 component</span>
        <span>5,210 downloads</span>
        <span>142 stars</span>
      </div>

      <h2 className="font-display font-medium text-lg mt-10">Published</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {SAMPLE.map((c) => <ComponentCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
