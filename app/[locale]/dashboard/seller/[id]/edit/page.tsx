import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, getPathname, redirect } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/identity/viewer";
import { isOwnedBySeller } from "@/lib/commerce/components-write";
import { getComponentTagNames, type ComponentTagsDb } from "@/lib/commerce/components";
import { narrowDb } from "@/lib/db-port";
import { EditForm } from "@/components/component-form";

// Server component: resolves who's editing, loads the component (with its
// tags), and 404s a stranger before renderin the client form. Ownership
// check lives here (fail fast, no form flash) AND again in the PATCH
// route (defense in depth — the browser can't be trusted).
export const dynamic = "force-dynamic";

export default async function EditComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getViewer();
  if (!profile) {
    const locale = await getLocale();
    const back = getPathname({ href: `/dashboard/seller/${id}/edit`, locale });
    return redirect({ href: { pathname: "/sign-in", query: { redirect_url: back } }, locale });
  }

  const supabase = createServiceClient();

  const { data: component } = await supabase
    .from("components")
    .select("id, seller_id, name, description, readme, ecosystems, price_cents, currency, zip_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!component) notFound();
  // A "not yours" attempt looks the same as "doesn't exist" — no leak of
  // which listing ids exist.
  if (!isOwnedBySeller(component, profile.id)) notFound();

  // Load the current tag names so the form can show them pre-filled.
  const t = await getTranslations("EditPage");
  const tagNames = await getComponentTagNames(narrowDb<ComponentTagsDb>(supabase), component.id);

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="font-display font-bold text-3xl mt-2">{t("title")}</h1>
      <p className="text-muted text-sm mt-2">
        {t.rich("intro", {
          view: (chunks) => (
            <Link href={`/components/${component.id}`} className="text-accent hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <EditForm
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
