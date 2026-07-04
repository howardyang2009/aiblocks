import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { ComponentCard } from "@/components/component-card";
import { listPublishedComponents, type ListComponentsDb } from "@/lib/browse";
import { narrowDb } from "@/lib/db-port";

// Reads real published components. Dynamic because results depend on the
// query string and change as people publish.
export const dynamic = "force-dynamic";

type Search = { q?: string; sort?: string; tag?: string };

function qs(next: Search) {
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.sort && next.sort !== "newest") p.set("sort", next.sort);
  if (next.tag) p.set("tag", next.tag);
  const s = p.toString();
  return s ? `/browse?${s}` : "/browse";
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim() || undefined;
  const sort = resolvedSearchParams.sort || "newest";
  const tag = resolvedSearchParams.tag?.trim().toLowerCase() || undefined;

  const { components } = await listPublishedComponents(narrowDb<ListComponentsDb>(createServiceClient()), {
    q,
    sort,
    tag,
  });

  const sorts: [string, string][] = [
    ["newest", "Newest"],
    ["downloads", "Most downloaded"],
    ["stars", "Most starred"],
  ];

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="font-display font-bold text-3xl mt-2">Browse components</h1>
        </div>
        <form action="/browse" className="w-full sm:w-72">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search components…"
            className="w-full rounded-block border bg-surface px-4 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </form>
      </header>

      {/* Active filters + sort */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex gap-3 font-mono text-xs">
          {sorts.map(([key, label]) => {
            const active = sort === key || (key === "newest" && !resolvedSearchParams.sort);
            return (
              <Link
                key={key}
                href={qs({ q, tag, sort: key })}
                className={active ? "text-accent" : "text-subtle hover:text-ink"}
              >
                {label}
              </Link>
            );
          })}
        </div>
        {tag && (
          <span className="font-mono text-xs flex items-center gap-2">
            <span className="rounded-[3px] bg-ink text-paper px-2 py-1">#{tag}</span>
            <Link href={qs({ q, sort })} className="text-subtle hover:text-ink">clear</Link>
          </span>
        )}
        {q && (
          <span className="font-mono text-xs text-subtle">
            results for “{q}” · <Link href={qs({ tag, sort })} className="hover:text-ink">clear</Link>
          </span>
        )}
      </div>

      {/* Results */}
      {components.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted text-sm">No components match yet.</p>
          <Link href="/dashboard/seller/new" className="inline-block mt-4 text-accent text-sm underline">
            Publish the first one →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {components.map((c) => <ComponentCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
