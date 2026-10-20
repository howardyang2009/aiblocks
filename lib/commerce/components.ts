import type { Tables } from "@/types/database";

// Every Comment, Review, Reply and Star is scoped to a Component that must
// exist and be published — this was five independent copies of the same
// select-then-check before being pulled out here.
export type PublishedComponentDb = {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: Tables<"components"> | null }>;
      };
    };
  };
};

export async function getPublishedComponent(
  supabase: PublishedComponentDb,
  id: string
): Promise<Tables<"components"> | null> {
  const { data } = await supabase.from("components").select("*").eq("id", id).maybeSingle();
  return data && data.status === "published" ? data : null;
}

// The narrow slice of the Supabase client getComponentTagNames touches: one
// select on component_tags with the tag name embedded through the
// component_tags.tag_id -> tags.id foreign key (a to-one embed, so `tags` is
// an object, not an array).
export type ComponentTagsDb = {
  from(table: "component_tags"): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: { tags: { name: string } | null }[] | null }>;
    };
  };
};

// A component's current tag names — the edit page (pre-filling the form)
// and the component detail page's view-model both need this same lookup;
// this is the one implementation of it. One round trip: the tag name comes
// embedded via the FK instead of a second query by tag id.
export async function getComponentTagNames(supabase: ComponentTagsDb, componentId: string): Promise<string[]> {
  const { data } = await supabase.from("component_tags").select("tags!inner(name)").eq("component_id", componentId);
  return (data ?? []).flatMap((r) => (r.tags ? [r.tags.name] : []));
}
