import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { narrowDb } from "@/lib/db-port";
import { listPublishedComponents, type ListComponentsDb } from "@/lib/commerce/browse";
import { ComponentCard } from "@/components/component-card";
import { ExternalSearchForm } from "@/components/external-search/ExternalSearchForm";
import {
  ExternalResultsSection,
  ExternalResultsSkeleton,
} from "@/components/external-search/ExternalResultsSection";
import { resolveComponentType, tagForComponentType } from "@/lib/external-search/search-query";
import { createAdapters, selectAdapters } from "@/lib/external-search/adapters";
import { getConfig } from "@/lib/external-search/config";
import { runSearch } from "@/lib/external-search/search/orchestrator";
import { pageMetadata } from "@/i18n/metadata";
import { localizeSummaries, type DisplayDb } from "@/lib/translation/display";

export const dynamic = "force-dynamic";

type Search = { q?: string; type?: string; source?: string };

// Search results stay out of the index; Browse is the indexed listing (#68).
export function generateMetadata() {
  return pageMetadata("search");
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const q = resolved.q?.trim();
  const locale = await getLocale();
  if (!q) return redirect({ href: "/", locale });

  const type = resolveComponentType(resolved.type);
  const tag = tagForComponentType(type);

  // Started before the catalog query so both run in parallel, but only the
  // Suspense boundary below waits on it (#80).
  const external = getConfig().then((config) => runSearch(selectAdapters(createAdapters(config), type), q, type));
  const supabase = createServiceClient();
  const { components } = await listPublishedComponents(narrowDb<ListComponentsDb>(supabase), { q, tag });
  const catalogMatches = await localizeSummaries(narrowDb<DisplayDb>(supabase), components.slice(0, 6), locale);

  const t = await getTranslations("SearchPage");

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <ExternalSearchForm defaultQuery={q} selectedType={type} />
      </div>

      {catalogMatches.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="font-display font-bold text-xl">{t("fromAiBlocks")}</h2>
            <Link
              href={`/browse?q=${encodeURIComponent(q)}&tag=${tag}`}
              className="font-mono text-xs text-accent hover:underline"
            >
              {t("browseAll")}
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {catalogMatches.map((c) => (
              <ComponentCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <Suspense fallback={<ExternalResultsSkeleton />}>
        <ExternalResultsSection
          q={q}
          type={type}
          external={external}
          activeSource={resolved.source}
          catalogCount={catalogMatches.length}
        />
      </Suspense>
    </div>
  );
}
