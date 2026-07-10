import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { listPublishedComponents, type ListComponentsDb } from "@/lib/commerce/browse";
import { ComponentCard } from "@/components/component-card";
import { ExternalSearchForm } from "@/components/external-search/ExternalSearchForm";
import { ExternalResultsList } from "@/components/external-search/ExternalResultsList";
import { resolveComponentType, tagForComponentType } from "@/lib/external-search/search-query";
import { createAdapters, selectAdapters } from "@/lib/external-search/adapters";
import { getConfig } from "@/lib/external-search/config";
import { runSearch } from "@/lib/external-search/search/orchestrator";
import { selectExternalResults } from "@/lib/external-search/search/by-source";

export const dynamic = "force-dynamic";

type Search = { q?: string; type?: string; source?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const q = resolved.q?.trim();
  if (!q) redirect("/");

  const type = resolveComponentType(resolved.type);
  const tag = tagForComponentType(type);

  const configPromise = getConfig();
  const [{ components: catalogMatches }, external] = await Promise.all([
    listPublishedComponents(narrowDb<ListComponentsDb>(createServiceClient()), { q, tag }),
    configPromise.then((config) => runSearch(selectAdapters(createAdapters(config), type), q, type)),
  ]);

  const activeSource = resolved.source;
  const { results: externalResults, availableSources } = selectExternalResults(external, activeSource);
  const hasAnyResults = catalogMatches.length > 0 || externalResults.length > 0;

  function sourceHref(source?: string) {
    const p = new URLSearchParams({ q: q as string, type });
    if (source) p.set("source", source);
    return `/search?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <ExternalSearchForm defaultQuery={q} selectedType={type} />
      </div>

      {!hasAnyResults && (
        <p className="mt-10 text-center text-muted">
          No results for &ldquo;{q}&rdquo;. Try a different type or a different query.
        </p>
      )}

      {catalogMatches.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="font-display font-bold text-xl">From AiBlocks</h2>
            <Link
              href={`/browse?q=${encodeURIComponent(q)}&tag=${tag}`}
              className="font-mono text-xs text-accent hover:underline"
            >
              browse all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {catalogMatches.slice(0, 6).map((c) => (
              <ComponentCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display font-bold text-xl">From around the web</h2>
          {availableSources.length > 0 && (
            <div className="flex flex-wrap gap-3 font-mono text-xs">
              <Link href={sourceHref()} className={!activeSource ? "text-accent" : "text-subtle hover:text-ink"}>
                all
              </Link>
              {availableSources.map((s) => (
                <Link
                  key={s.source}
                  href={sourceHref(s.source)}
                  className={activeSource === s.source ? "text-accent" : "text-subtle hover:text-ink"}
                >
                  {s.source} ({s.count})
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-subtle">
          {external.sources.map((s) => (
            <span key={s.source}>
              {s.source}: {s.status === "ok" ? s.count : s.status}
            </span>
          ))}
        </div>

        <div className="mt-4">
          <ExternalResultsList results={externalResults} />
        </div>
      </section>
    </div>
  );
}
