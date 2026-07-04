import type { Tables, ComponentSummary } from "@/types/database";
import { COMPONENT_SUMMARY_COLS } from "@/lib/constants";

export type ListPublishedComponentsArgs = {
  q?: string;
  sort?: string;
  tag?: string;
};

export type ListPublishedComponentsResult = {
  components: ComponentSummary[];
  error: string | null;
};

// The components query builder, narrowed to the handful of chainable
// methods this module actually calls — every method returns the same
// shape (matching the real Postgrest builder, which is thenable at every
// step), since q/tag/sort each conditionally add one link in the chain.
type ComponentsQuery = PromiseLike<{ data: ComponentSummary[] | null; error: { message: string } | null }> & {
  eq(column: string, value: string): ComponentsQuery;
  textSearch(column: string, query: string, opts: { type: "websearch" }): ComponentsQuery;
  in(column: string, values: string[]): ComponentsQuery;
  order(column: string, opts: { ascending: boolean }): ComponentsQuery;
  limit(n: number): ComponentsQuery;
};

export type ListComponentsDb = {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): ComponentsQuery;
    };
  };
  from(table: "tags"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: Pick<Tables<"tags">, "id"> | null }>;
      };
    };
  };
  from(table: "component_tags"): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: Pick<Tables<"component_tags">, "component_id">[] | null }>;
    };
  };
};

// .in() with an empty array matches everything in Postgrest — an unknown
// tag needs to mean "no matches," so an unmatchable placeholder id is used
// instead of an empty list.
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

// Browse + search + sort + tag-filter, shared by the Browse page and the
// public API route so neither can drift from the other. Uses Postgres
// full-text search on the generated search_tsv column.
export async function listPublishedComponents(
  supabase: ListComponentsDb,
  args: ListPublishedComponentsArgs
): Promise<ListPublishedComponentsResult> {
  let componentIds: string[] | null = null;
  if (args.tag) {
    const { data: tagRow } = await supabase.from("tags").select("id").eq("name", args.tag).maybeSingle();
    if (tagRow) {
      const { data: links } = await supabase
        .from("component_tags")
        .select("component_id")
        .eq("tag_id", tagRow.id);
      componentIds = (links ?? []).map((r) => r.component_id);
    } else {
      componentIds = []; // unknown tag -> no matches
    }
  }

  let query = supabase.from("components").select(COMPONENT_SUMMARY_COLS).eq("status", "published");

  if (args.q) query = query.textSearch("search_tsv", args.q, { type: "websearch" });
  if (componentIds) query = query.in("id", componentIds.length ? componentIds : [NO_MATCH_ID]);

  const orderCol = args.sort === "downloads" ? "download_count" : args.sort === "stars" ? "star_count" : "created_at";
  query = query.order(orderCol, { ascending: false }).limit(48);

  const { data, error } = await query;
  return { components: data ?? [], error: error?.message ?? null };
}
