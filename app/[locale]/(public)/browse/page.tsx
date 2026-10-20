import { getLocale, getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { ComponentCard } from "@/components/component-card";
import { listPublishedComponents, type ListComponentsDb } from "@/lib/commerce/browse";
import { narrowDb } from "@/lib/db-port";
import { pageMetadata } from "@/i18n/metadata";

// Reads real published components. Dynamic because results depend on the
// query string and change as people publish.
export const dynamic = "force-dynamic";

type Search = { q?: string; sort?: string; tag?: string };

export function generateMetadata() {
  return pageMetadata("browse");
}

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

  const t = await getTranslations("BrowsePage");
  const sorts = ["newest", "downloads", "stars"] as const;

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="font-display font-bold text-3xl mt-2">{t("title")}</h1>
        </div>
        <form action={getPathname({ href: "/browse", locale: await getLocale() })} className="w-full sm:w-72">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-block border bg-surface px-4 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </form>
      </header>

      {/* Active filters + sort */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex gap-3 font-mono text-xs">
          {sorts.map((key) => {
            const active = sort === key || (key === "newest" && !resolvedSearchParams.sort);
            return (
              <Link
                key={key}
                href={qs({ q, tag, sort: key })}
                className={active ? "text-accent" : "text-subtle hover:text-ink"}
              >
                {t(`sort.${key}`)}
              </Link>
            );
          })}
        </div>
        {tag && (
          <span className="font-mono text-xs flex items-center gap-2">
            <span className="rounded-[3px] bg-accent text-accent-ink px-2 py-1">#{tag}</span>
            <Link href={qs({ q, sort })} className="text-subtle hover:text-ink">{t("clear")}</Link>
          </span>
        )}
        {q && (
          <span className="font-mono text-xs text-subtle">
            {t("resultsFor", { query: q })} · <Link href={qs({ tag, sort })} className="hover:text-ink">{t("clear")}</Link>
          </span>
        )}
      </div>

      {/* Results */}
      {components.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted text-sm">{t("empty")}</p>
          <Link href="/dashboard/seller/new" className="inline-block mt-4 text-accent text-sm underline">
            {t("publishFirst")}
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
