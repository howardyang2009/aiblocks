import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { listLatestPublished, type ListComponentsDb } from "@/lib/commerce/browse";
import { narrowDb } from "@/lib/db-port";
import { ComponentCard } from "@/components/component-card";
import { AssemblyGrid } from "@/components/brand/assembly-grid";
import { ExternalSearchForm } from "@/components/external-search/ExternalSearchForm";

// Home. A Google-style search is the first thing a visitor sees; the
// assembly-grid hero (the brand signature) follows right below it.
export const dynamic = "force-dynamic";

const PRIMARY_TAGS = [
  "mcp-server",
  "claude-md",
  "subagent",
  "hook",
  "prompt",
  "skill",
  "claude-plugin",
  "slash-command",
];

export default async function HomePage() {
  const { components: latest } = await listLatestPublished(
    narrowDb<ListComponentsDb>(createServiceClient()),
    6
  );
  const t = await getTranslations("HomePage");

  return (
    <div className="mx-auto max-w-shell px-5">
      {/* Search hero */}
      <section className="py-20 lg:py-28 text-center">
        <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mt-3">
          {t("title")}
        </h1>
        <div className="mt-8 max-w-2xl mx-auto">
          <ExternalSearchForm />
        </div>
      </section>

      {/* Hero */}
      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-24 border-t">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl mt-4 leading-[1.05]">
            {t.rich("heroTitle", { br: () => <br /> })}
          </h2>
          <p className="mt-5 text-muted max-w-md">{t("heroBody")}</p>
          <div className="mt-8 flex gap-3">
            <Link href="/browse" className="rounded-block bg-accent text-accent-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-strong transition-colors">
              {t("browseComponents")}
            </Link>
            <Link href="/dashboard/seller/new" className="rounded-block border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
              {t("publishYours")}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {PRIMARY_TAGS.map((tag) => (
              <Link key={tag} href={`/browse?tag=${tag}`} className="font-mono text-xs rounded-[3px] border px-2 py-1 text-muted hover:border-accent">
                {tag}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-block border bg-surface p-6">
          <AssemblyGrid />
          <p className="eyebrow mt-5">{t("gridCaption")}</p>
        </div>
      </section>

      {/* How it works — a real sequence, so numbering is earned */}
      <section className="py-12 border-t">
        <div className="grid sm:grid-cols-3 gap-8">
          {(["publish", "discover", "earn"] as const).map((step, i) => (
            <div key={step}>
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display font-medium text-lg mt-2">{t(`steps.${step}.title`)}</h3>
              <p className="text-sm text-muted mt-1.5">{t(`steps.${step}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest components — real data */}
      {latest.length > 0 && (
        <section className="py-12 border-t">
          <div className="flex items-end justify-between">
            <h2 className="font-display font-bold text-2xl">{t("latest")}</h2>
            <Link href="/browse" className="font-mono text-xs text-accent hover:underline">{t("browseAll")}</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {latest.map((c) => <ComponentCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

    </div>
  );
}
