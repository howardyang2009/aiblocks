import type { createServiceClient } from "@/lib/supabase/server";

type RealDb = ReturnType<typeof createServiceClient>;

// Narrows the real Supabase client down to whatever minimal structural
// shape a function actually calls (a "port") — a test fake only needs to
// implement the one chain it's given, not the whole query-builder API.
//
// TypeScript's structural check of the full generic SupabaseClient<Database>
// against a narrow port can hit its recursion limit ("Type instantiation is
// excessively deep") — it's order/cache-sensitive and can pass locally
// while failing on a clean CI build (this broke a production deploy once
// already). One generic cast here replaces a hand-rolled `to*Db` factory
// per operation; only the port type itself (what the function actually
// touches) still needs declaring at each call site.
export function narrowDb<T>(supabase: RealDb): T {
  return supabase as unknown as T;
}

// The shape a "delete scoped to two filter columns" call returns — e.g.
// `.eq("id", commentId).eq("user_id", userId)`. Comment, Review, Reply and
// Star each delete this way; named once here instead of four times.
export type DeleteChain = {
  eq(column: string, value: string): {
    eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
  };
};

// A port for a module whose only operation on `Table` is that scoped
// delete — Comment, Review and Reply each use this directly. Star does the
// same delete alongside a select/insert on the same table, so it references
// DeleteChain inline instead (two `from(table)` overloads for the same
// table literal don't merge structurally, so this generic only fits
// modules where delete is the sole operation on the table).
export type ScopedDeleteDb<Table extends string> = {
  from(table: Table): {
    delete(): DeleteChain;
  };
};
