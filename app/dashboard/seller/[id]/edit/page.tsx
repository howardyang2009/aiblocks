import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { EditComponentForm } from "./edit-form";

// Server component: resolves who's editing, loads the component (with its
// tags), and 404s a stranger before renderin the client form. Ownership
// check lives here (fail fast, no form flash) AND again in the PATCH
// route (defense in depth — the browser can't be trusted).
export const dynamic = "force-dynamic";

export default async function EditComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getViewer();
  if (!profile) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/dashboard/seller/${id}/edit`)}`);

  const supabase = createServiceClient();

  const { data: component } = await supabase
    .from("components")
    .select("id, seller_id, name, description, readme, ecosystems, price_cents, currency, zip_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!component) notFound();
  // A "not yours" attempt looks the same as "doesn't exist" — no leak of
  // which listing ids exist.
  if (component.seller_id !== profile.id) notFound();

  // Load the current tag names so the form can show them pre-filled.
  const { data: ctRows } = await supabase
    .from("component_tags")
    .select("tag_id")
    .eq("component_id", component.id);

  const tagIds = (ctRows ?? []).map((r) => r.tag_id);
  let tagNames: string[] = [];
  if (tagIds.length) {
    const { data: tagRows } = await supabase.from("tags").select("name").in("id", tagIds);
    tagNames = (tagRows ?? []).map((t) => t.name);
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">Seller</p>
      <h1 className="font-display font-bold text-3xl mt-2">Edit component</h1>
      <p className="text-muted text-sm mt-2">
        Update details in place. Uploading a new zip is optional —{" "}
        <Link href={`/components/${component.id}`} className="text-accent hover:underline">
          view your listing
        </Link>
        .
      </p>

      <EditComponentForm
        componentId={component.id}
        initial={{
          name: component.name,
          description: component.description,
          readme: component.readme ?? "",
          ecosystems: (component.ecosystems ?? []).join(", "),
          tags: tagNames.join(", "),
          // Displayed in dollars — the form parses this back to cents on save.
          price: (component.price_cents / 100).toString(),
          currentZipPath: component.zip_path,
        }}
      />
    </div>
  );
}
