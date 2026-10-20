import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { ComponentCard } from "@/components/component-card";
import { listEntitlements, type EntitlementListDb } from "@/lib/commerce/entitlements";
import { listComponentsByIds, type ListByIdsDb } from "@/lib/commerce/browse";
import { narrowDb } from "@/lib/db-port";
import { getViewer } from "@/lib/identity/viewer";
import { localizeSummaries, type DisplayDb, type LocalizedSummary } from "@/lib/translation/display";

// My Downloads — the buyer's library. Reads the `downloads` table (the
// entitlement record created on a free download or after a paid purchase),
// then loads the matching components. Re-download anytime from the detail page.
export const dynamic = "force-dynamic";

export default async function MyDownloadsPage() {
  const t = await getTranslations("DownloadsPage");
  const { profile } = await getViewer();
  const supabase = createServiceClient();

  let components: LocalizedSummary[] = [];

  if (profile) {
    // Library entries, newest first.
    const dl = await listEntitlements(narrowDb<EntitlementListDb>(supabase), profile.id);
    const ids = dl.map((r) => r.component_id);
    const { components: acquired } = await listComponentsByIds(narrowDb<ListByIdsDb>(supabase), ids);
    components = await localizeSummaries(narrowDb<DisplayDb>(supabase), acquired, await getLocale());
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="font-display font-bold text-3xl mt-2">{t("title")}</h1>
      <p className="text-muted text-sm mt-2">{t("intro")}</p>

      {components.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
          <Link href="/browse" className="inline-block mt-4 text-accent text-sm underline">
            {t("browse")}
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
