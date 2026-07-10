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

// The narrow slice of the Supabase client getComponentTagNames touches.
export type ComponentTagsDb = {
  from(table: "component_tags"): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: { tag_id: string }[] | null }>;
    };
  };
  from(table: "tags"): {
    select(columns: string): {
      in(column: string, values: string[]): PromiseLike<{ data: { name: string }[] | null }>;
    };
  };
};

// A component's current tag names — the edit page (pre-filling the form)
// and the component detail page's view-model both need this same
// tag_id-then-name lookup; this is the one implementation of it. Skips the
// second query entirely when there are no tags to look up.
export async function getComponentTagNames(supabase: ComponentTagsDb, componentId: string): Promise<string[]> {
  const { data: ctRows } = await supabase.from("component_tags").select("tag_id").eq("component_id", componentId);
  const tagIds = (ctRows ?? []).map((r) => r.tag_id);
  if (!tagIds.length) return [];

  const { data: tagRows } = await supabase.from("tags").select("name").in("id", tagIds);
  return (tagRows ?? []).map((t) => t.name);
}
