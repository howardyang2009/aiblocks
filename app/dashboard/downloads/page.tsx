import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { ComponentCard } from "@/components/component-card";
import { listEntitlements, type DownloadListDb } from "@/lib/commerce/entitlements";
import { listComponentsByIds, type ListByIdsDb } from "@/lib/commerce/browse";
import { narrowDb } from "@/lib/db-port";
import { getViewer } from "@/lib/identity/viewer";
import type { ComponentSummary } from "@/types/database";

// My Downloads — the buyer's library. Reads the `downloads` table (the
// entitlement record created on a free download or after a paid purchase),
// then loads the matching components. Re-download anytime from the detail page.
export const dynamic = "force-dynamic";

export default async function MyDownloadsPage() {
  const { profile } = await getViewer();
  const supabase = createServiceClient();

  let components: ComponentSummary[] = [];

  if (profile) {
    // Library entries, newest first.
    const dl = await listEntitlements(narrowDb<DownloadListDb>(supabase), profile.id);
    const ids = dl.map((r) => r.component_id);
    ({ components } = await listComponentsByIds(narrowDb<ListByIdsDb>(supabase), ids));
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">Your library</p>
      <h1 className="font-display font-bold text-3xl mt-2">My downloads</h1>
      <p className="text-muted text-sm mt-2">
        Everything you've acquired — open one to re-download anytime.
      </p>

      {components.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted">Nothing here yet.</p>
          <Link href="/browse" className="inline-block mt-4 text-accent text-sm underline">
            Browse components →
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
