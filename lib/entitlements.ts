import type { Tables } from "@/types/database";

// The `downloads` table is the single source of truth for "does this user
// own this component" — a row exists after a free download or a confirmed
// paid purchase (see app/api/webhooks/stripe/route.ts), and doubles as proof
// of entitlement for the download paywall and verified-buyer reviews alike.
//
// Each function below declares the narrowest possible slice of the Supabase
// client it actually calls — the real client satisfies these structurally,
// but a test fake only needs to implement the one chain it's given, not the
// whole query-builder API. Callers narrow the real client into one of these
// with narrowDb<T>() — see lib/db-port.ts for why the cast is needed.

export type DownloadLookupDb = {
  from(table: "downloads"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): PromiseLike<{ data: Pick<Tables<"downloads">, "id"> | null }>;
        };
      };
    };
  };
};

// Does this user own this component?
export async function getEntitlement(
  supabase: DownloadLookupDb,
  userId: string,
  componentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("downloads")
    .select("id")
    .eq("user_id", userId)
    .eq("component_id", componentId)
    .maybeSingle();
  return !!data;
}

export type DownloadListDb = {
  from(table: "downloads"): {
    select(columns: string): {
      eq(column: string, value: string): {
        order(
          column: string,
          opts: { ascending: boolean }
        ): PromiseLike<{ data: Pick<Tables<"downloads">, "component_id" | "acquired_at">[] | null }>;
      };
    };
  };
};

// Every component a user has acquired, newest first — the buyer's library.
export async function listEntitlements(
  supabase: DownloadListDb,
  userId: string
): Promise<Pick<Tables<"downloads">, "component_id" | "acquired_at">[]> {
  const { data } = await supabase
    .from("downloads")
    .select("component_id, acquired_at")
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });
  return data ?? [];
}

export type DownloadGrantDb = {
  from(table: "downloads"): {
    upsert(
      row: { user_id: string; component_id: string; purchase_id: string | null },
      opts: { onConflict: string; ignoreDuplicates: boolean }
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

// Record that a user has acquired a component — idempotent (the downloads
// trigger bumps download_count only on first insert). Called on a free
// download and after a paid purchase is confirmed by the Stripe webhook;
// `purchaseId` is omitted for free downloads.
export async function grantEntitlement(
  supabase: DownloadGrantDb,
  args: { userId: string; componentId: string; purchaseId?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("downloads").upsert(
    { user_id: args.userId, component_id: args.componentId, purchase_id: args.purchaseId ?? null },
    { onConflict: "user_id,component_id", ignoreDuplicates: true }
  );
  return { error: error?.message ?? null };
}
