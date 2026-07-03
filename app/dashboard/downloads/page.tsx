import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { COMPONENT_SUMMARY_COLS } from "@/lib/constants";
import { ComponentCard } from "@/components/component-card";
import { listEntitlements } from "@/lib/entitlements";
import { getViewer } from "@/lib/viewer";
import type { ComponentSummary } from "@/types/database";

// My Downloads — the buyer's library. Reads the `downloads` table (the
// entitlement record created on a free download or after a paid purchase),
// then loads the matching components. Re-download anytime from the detail page.
export const dynamic = "force-dynamic";

export default async function MyDownloadsPage() {
  const supabase = createServiceClient();
  const { profile } = await getViewer(supabase);

  let components: ComponentSummary[] = [];

  if (profile) {
    // Library entries, newest first.
    const dl = await listEntitlements(supabase, profile.id);

    const ids = dl.map(r => r.component_id);
    if (ids.length) {
      const { data: comps } = await supabase
        .from("components")
        .select(COMPONENT_SUMMARY_COLS)
        .in("id", ids);

      // Preserve the acquired-at ordering from the downloads query.
      const rank = new Map(ids.map((id: string, i: number) => [id, i]));
      components = ((comps ?? []) as ComponentSummary[]).sort(
        (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)
      );
    }
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
