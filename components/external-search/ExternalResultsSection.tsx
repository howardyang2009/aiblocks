import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/utils";
import { ExternalResultsList } from "./ExternalResultsList";
import type { ComponentType } from "@/lib/external-search/adapters/types";
import type { SearchResponse } from "@/lib/external-search/search/orchestrator";
import { selectExternalResults } from "@/lib/external-search/search/by-source";

type Props = {
  q: string;
  type: ComponentType;
  search: Promise<SearchResponse>;
  activeSource?: string;
  catalogCount: number;
};

// Waits on every external source, so /search renders it inside <Suspense>: the
// form and the AiBlocks matches stream first and this fills in after (#80).
export async function ExternalResultsSection({ q, type, search, activeSource, catalogCount }: Props) {
  const external = await search;
  const locale = await getLocale();
  const { results, availableSources } = selectExternalResults(external, activeSource);
  const t = await getTranslations("SearchPage");

  function sourceHref(source?: string) {
    const p = new URLSearchParams({ q, type });
    if (source) p.set("source", source);
    return `/search?${p.toString()}`;
  }

  // Lives here, not in the page, because it needs the external count too.
  return (
    <>
      {catalogCount === 0 && results.length === 0 && (
        <p className="mt-10 text-center text-muted">{t("noResults", { query: q })}</p>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display font-bold text-xl">{t("fromWeb")}</h2>
          {availableSources.length > 0 && (
            <div className="flex flex-wrap gap-3 font-mono text-xs">
              <Link href={sourceHref()} className={!activeSource ? "text-accent" : "text-subtle hover:text-ink"}>
                {t("allSources")}
              </Link>
              {availableSources.map((s) => (
                <Link
                  key={s.source}
                  href={sourceHref(s.source)}
                  className={activeSource === s.source ? "text-accent" : "text-subtle hover:text-ink"}
                >
                  {s.source} ({formatNumber(s.count, locale)})
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-subtle">
          {external.sources.map((s) => (
            <span key={s.source}>
              {s.source}: {s.status === "ok" ? s.count : t(`sourceStatus.${s.status}`)}
            </span>
          ))}
        </div>

        <div className="mt-4">
          <ExternalResultsList results={results} />
        </div>
      </section>
    </>
  );
}

export async function ExternalResultsSkeleton() {
  const t = await getTranslations("SearchPage");
  return (
    <section className="mt-10" aria-busy="true">
      <h2 className="font-display font-bold text-xl">{t("fromWeb")}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-block border bg-surface animate-pulse" />
        ))}
      </div>
    </section>
  );
}
