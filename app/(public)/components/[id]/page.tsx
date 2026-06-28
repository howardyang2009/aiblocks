import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarButton } from "@/components/star-button";
import { DownloadButton } from "@/components/download-button";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ComponentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: c } = await supabase
    .from("components")
    .select("*")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!c) notFound();
  const component = c as any;

  // Seller for attribution.
  const { data: seller } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", component.seller_id)
    .maybeSingle();

  // Tags (two-step to avoid join-shape ambiguity).
  const { data: ctRows } = await supabase
    .from("component_tags").select("tag_id").eq("component_id", component.id);
  const tagIds = (ctRows ?? []).map((r: any) => r.tag_id);
  let tags: string[] = [];
  if (tagIds.length) {
    const { data: tg } = await supabase.from("tags").select("name").in("id", tagIds);
    tags = (tg ?? []).map((r: any) => r.name);
  }

  // Current user: starred? owns it?
  const { userId } = auth();
  let starred = false;
  let owned = false;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles").select("id").eq("clerk_user_id", userId).maybeSingle();
    if (profile) {
      const pid = (profile as any).id;
      const { data: s } = await supabase
        .from("stars").select("user_id").eq("user_id", pid).eq("component_id", component.id).maybeSingle();
      starred = !!s;
      const { data: d } = await supabase
        .from("downloads").select("id").eq("user_id", pid).eq("component_id", component.id).maybeSingle();
      owned = !!d;
    }
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10 grid lg:grid-cols-[1fr_320px] gap-10">
      <article>
        <p className="eyebrow">Component</p>
        <h1 className="font-display font-bold text-3xl mt-2">{component.name}</h1>
        <p className="text-muted mt-2">{component.description}</p>

        {seller && (
          <p className="text-sm text-subtle mt-3">
            by{" "}
            <Link href={`/sellers/${(seller as any).username}`} className="text-accent hover:underline">
              @{(seller as any).username}
            </Link>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {component.ecosystems?.map((e: string) => (
            <span key={e} className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle">{e}</span>
          ))}
          {tags.map((t) => (
            <Link key={t} href={`/browse?tag=${encodeURIComponent(t)}`}
              className="font-mono text-[11px] rounded-[3px] border px-1.5 py-0.5 text-subtle hover:border-accent">
              #{t}
            </Link>
          ))}
        </div>

        <hr className="my-8" />
        {component.readme?.trim()
          ? <MarkdownRenderer source={component.readme} />
          : <p className="text-sm text-subtle">No README provided.</p>}
      </article>

      <aside className="lg:sticky lg:top-8 h-fit rounded-block border bg-surface p-5">
        <p className="font-mono text-2xl">{formatPrice(component.price_cents, component.currency)}</p>
        {owned && component.price_cents > 0 && (
          <p className="font-mono text-[11px] text-free mt-1">purchased</p>
        )}
        <div className="mt-4">
          <DownloadButton
            componentId={component.id}
            priceCents={component.price_cents}
            owned={owned}
            signedIn={!!userId}
          />
        </div>
        <div className="mt-4">
          <StarButton componentId={component.id} initialCount={component.star_count} initialStarred={starred} />
        </div>
        <dl className="mt-6 space-y-2 font-mono text-xs text-subtle">
          <div className="flex justify-between"><dt>downloads</dt><dd>{component.download_count}</dd></div>
          <div className="flex justify-between"><dt>stars</dt><dd>{component.star_count}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
