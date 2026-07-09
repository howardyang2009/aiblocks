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
