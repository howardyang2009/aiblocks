import type { Tables, TablesUpdate } from "@/types/database";
import { parseList } from "@/lib/utils";
import {
  validatePublishName,
  validatePublishDescription,
  parsePublishPrice,
} from "@/lib/publish";

// Parsed + shaped edit payload — same shape as PublishInput minus the
// invariants that don't change on edit (seller_id, slug, status). `zipPath`
// is OPTIONAL: undefined means "keep the current zip", a string means
// "replace it with the freshly-uploaded one at this path".
export type EditInput = {
  name: string;
  description: string;
  readme: string;
  ecosystems: string[];
  tagNames: string[];
  priceCents: number;
  zipPath?: string;
};

export type EditInputResult =
  | { ok: true; data: EditInput }
  | { ok: false; status: number; error: string };

// Reuses the same field-level rules as parsePublishInput so the two can't
// silently drift. Difference from publish: zipPath is OPTIONAL — the seller
// may edit metadata without re-uploading. When it IS provided, the same
// per-seller namespace check applies as on publish, so a spoofed path can't
// point at another seller's storage folder.
export function parseEditInput(
  body: {
    name?: unknown; description?: unknown; readme?: unknown;
    zipPath?: unknown; price?: unknown;
    ecosystems?: string | string[]; tags?: string | string[];
  },
  sellerId: string
): EditInputResult {
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const readme = String(body.readme ?? "");

  const nameError = validatePublishName(name);
  if (nameError) return { ok: false, status: 400, error: nameError };

  const descriptionError = validatePublishDescription(description);
  if (descriptionError) return { ok: false, status: 400, error: descriptionError };

  const price = parsePublishPrice(String(body.price ?? "0"));
  if (!price.ok) return { ok: false, status: 400, error: price.error };

  // zipPath is optional on edit — omitting it means "keep the existing zip".
  // If present it must live under THIS seller's namespace, exactly as on
  // publish, so a spoofed path can't point at another seller's folder.
  let zipPath: string | undefined;
  const rawZip = body.zipPath;
  if (rawZip !== undefined && rawZip !== null && rawZip !== "") {
    const candidate = String(rawZip);
    if (!candidate.startsWith(`${sellerId}/`)) {
      return { ok: false, status: 403, error: "Upload path mismatch." };
    }
    zipPath = candidate;
  }

  return {
    ok: true,
    data: {
      name,
      description,
      readme,
      priceCents: price.cents,
      ecosystems: parseList(body.ecosystems),
      tagNames: parseList(body.tags),
      zipPath,
    },
  };
}

export type OwnedComponent = Pick<Tables<"components">, "id" | "seller_id" | "zip_path">;

// The narrow slice of the Supabase client updateComponent touches.
// components is used for a select (ownership + old zip) and an update.
// component_tags is wiped-and-relinked on every edit. tags is upserted so
// new free-form tag names become rows (same rule as publish).
export type UpdateComponentDb = {
  from(table: "components"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: OwnedComponent | null }>;
      };
    };
    update(row: TablesUpdate<"components">): {
      eq(column: string, value: string): {
        eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
  from(table: "component_tags"): {
    delete(): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
    insert(rows: { component_id: string; tag_id: string }[]): PromiseLike<{ error: { message: string } | null }>;
  };
  from(table: "tags"): {
    upsert(
      rows: { name: string }[],
      opts: { onConflict: string }
    ): {
      select(columns: string): PromiseLike<{
        data: Pick<Tables<"tags">, "id" | "name">[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export type UpdateComponentResult =
  | { ok: true; id: string; oldZipPath: string | null; newZipPath: string | null }
  | { ok: false; status: number; error: string };

// Load the component, verify ownership, update the mutable fields, then
// wipe-and-relink tags. Ownership is enforced BOTH by an initial fetch
// (fail fast with a real 404/403 instead of a silent no-op) AND by
// scoping the UPDATE with `.eq("seller_id", ...)` (defense in depth if
// the fetched row were somehow reused between the check and the write).
//
// Tag re-linking mirrors publish: upsert free-form names, insert links.
// Unlike publish it also DELETEs the previous links first, so removing a
// tag actually removes it. A tag failure is reported as a partial failure
// (component fields already updated) rather than pretending it succeeded,
// same visibility rule as publish.
//
// Returns oldZipPath/newZipPath so the caller can clean up the previous
// storage object when the zip was replaced.
export async function updateComponent(
  supabase: UpdateComponentDb,
  args: EditInput & { componentId: string; sellerId: string; sizeBytes?: number | null }
): Promise<UpdateComponentResult> {
  // Ownership check — 404 vs 403 vs proceed. This exists as its own step
  // (not just the .eq("seller_id", ...) filter on the update) so the seller
  // sees a real "not found" / "not yours" error instead of a silent no-op
  // when the id doesn't belong to them.
  const { data: existing } = await supabase
    .from("components")
    .select("id, seller_id, zip_path")
    .eq("id", args.componentId)
    .maybeSingle();

  if (!existing) return { ok: false, status: 404, error: "Component not found." };
  if (existing.seller_id !== args.sellerId) {
    return { ok: false, status: 403, error: "You can only edit your own components." };
  }

  // Only include zip_path / zip_size_bytes in the update when a new zip was
  // provided — omitting them keeps the current values intact.
  const patch: TablesUpdate<"components"> = {
    name: args.name,
    description: args.description,
    readme: args.readme,
    ecosystems: args.ecosystems,
    price_cents: args.priceCents,
  };
  if (args.zipPath) {
    patch.zip_path = args.zipPath;
    patch.zip_size_bytes = args.sizeBytes ?? null;
  }

  const { error: updateErr } = await supabase
    .from("components")
    .update(patch)
    .eq("id", args.componentId)
    // Defense in depth: even after the ownership check above, this scopes
    // the write to the caller's row, so a race or bug can't cross sellers.
    .eq("seller_id", args.sellerId);

  if (updateErr) {
    return { ok: false, status: 500, error: updateErr.message };
  }

  // Wipe the old tag links first, then upsert names and link them fresh.
  // Two separate calls (delete, then insert) — not a transaction — is
  // consistent with publish's tag path; a mid-flight failure leaves a
  // visible partial state rather than an invisible one.
  const { error: unlinkErr } = await supabase
    .from("component_tags")
    .delete()
    .eq("component_id", args.componentId);
  if (unlinkErr) {
    return { ok: false, status: 500, error: "Component updated, but clearing old tags failed." };
  }

  if (args.tagNames.length > 0) {
    const { data: tagRows, error: tagsErr } = await supabase
      .from("tags")
      .upsert(
        args.tagNames.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id, name");

    if (tagsErr) {
      return { ok: false, status: 500, error: "Component updated, but saving tags failed." };
    }

    if (tagRows && tagRows.length > 0) {
      const { error: linkErr } = await supabase.from("component_tags").insert(
        tagRows.map((t) => ({ component_id: args.componentId, tag_id: t.id }))
      );
      if (linkErr) {
        return { ok: false, status: 500, error: "Component updated, but linking tags failed." };
      }
    }
  }

  return {
    ok: true,
    id: args.componentId,
    oldZipPath: existing.zip_path ?? null,
    newZipPath: args.zipPath ?? null,
  };
}
