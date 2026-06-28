import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { ComponentCard } from "@/components/component-card";
import type { ComponentSummary } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage({ params }: { params: { username: string } }) {
  const supabase = createServiceClient();

  const { data: p } = await supabase
    .from("profiles").select("*").eq("username", params.username).maybeSingle();
  if (!p) notFound();
  const profile = p as any;

  const { data: comps } = await supabase
    .from("components")
    .select("id, name, description, ecosystems, price_cents, currency, star_count, download_count")
    .eq("seller_id", profile.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const components = (comps ?? []) as ComponentSummary[];

  const totalDownloads = components.reduce((a, c) => a + (c.download_count ?? 0), 0);
  const totalStars = components.reduce((a, c) => a + (c.star_count ?? 0), 0);

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <header className="flex items-center gap-5">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-block object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-block bg-ink" aria-hidden />
        )}
        <div>
          <h1 className="font-display font-bold text-2xl">@{profile.username}</h1>
          {profile.bio && <p className="text-muted text-sm mt-1">{profile.bio}</p>}
        </div>
      </header>

      <div className="mt-6 flex gap-8 font-mono text-xs text-subtle">
        <span>{components.length} component{components.length === 1 ? "" : "s"}</span>
        <span>{totalDownloads} downloads</span>
        <span>{totalStars} stars</span>
      </div>

      <h2 className="font-display font-medium text-lg mt-10">Published</h2>
      {components.length === 0 ? (
        <p className="text-sm text-muted mt-4">No components published yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {components.map((c) => <ComponentCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
