import { randomUUID } from "crypto";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";
import { slugify, parseList } from "@/lib/utils";
import { exceedsZipSizeLimit } from "@/lib/constants";

// A Seller submitting a Component — publish (create) and edit (update) —
// as one module. The two operations differ in real ways (edit's zipPath is
// optional and carries an ownership check; publish's doesn't), so they stay
// two functions; the field-level validation rules and the tag-relinking
// dance are the parts that were byte-identical, so those are shared.

export type PublishInput = {
  name: string;
  description: string;
  readme: string;
  zipPath: string;
  priceCents: number;
  ecosystems: string[];
  tagNames: string[];
};

export type PublishInputResult =
  | { ok: true; data: PublishInput }
  | { ok: false; status: number; error: string };

// Field-level rules shared by publish and edit — kept in one place so the
// two forms (and their server-side re-validation) can't silently drift the
// way they did before: the form used to skip the price check entirely,
// letting a negative price through until this server-side round-trip
// caught it.
export function validateComponentName(name: string): string | null {
  return name.trim().length < 3 ? "Name must be at least 3 characters." : null;
}

export function validateComponentDescription(description: string): string | null {
  return description.trim().length < 10 ? "Add a short description (10+ characters)." : null;
}

export type ParsedComponentPrice = { ok: true; cents: number } | { ok: false; error: string };

// Accept dollars, store integer cents.
export function parseComponentPrice(raw: string): ParsedComponentPrice {
  const dollars = parseFloat(raw);
  if (Number.isNaN(dollars) || dollars < 0) {
    return { ok: false, error: "Price must be 0 or a positive number." };
  }
  return { ok: true, cents: Math.round(dollars * 100) };
}

// Validates and shapes the raw publish request body — pure, no I/O, no
// Supabase, so it's testable with plain object literals.
export function parsePublishInput(
  body: {
    name?: unknown; description?: unknown; readme?: unknown;
    zipPath?: unknown; price?: unknown;
    ecosystems?: string | string[]; tags?: string | string[];
  },
  sellerId: string
): PublishInputResult {
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const readme = String(body.readme ?? "");
  const zipPath = String(body.zipPath ?? "");

  const nameError = validateComponentName(name);
  if (nameError) return { ok: false, status: 400, error: nameError };

  const descriptionError = validateComponentDescription(description);
  if (descriptionError) return { ok: false, status: 400, error: descriptionError };

  if (!zipPath) {
    return { ok: false, status: 400, error: "Upload a zip before publishing." };
  }
  // The uploaded object must live under THIS seller's namespace.
  if (!zipPath.startsWith(`${sellerId}/`)) {
    return { ok: false, status: 403, error: "Upload path mismatch." };
  }

  const price = parseComponentPrice(String(body.price ?? "0"));
  if (!price.ok) return { ok: false, status: 400, error: price.error };

  return {
    ok: true,
    data: {
      name,
      description,
      readme,
      zipPath,
      priceCents: price.cents,
      ecosystems: parseList(body.ecosystems),
      tagNames: parseList(body.tags),
    },
  };
}

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

  const nameError = validateComponentName(name);
  if (nameError) return { ok: false, status: 400, error: nameError };

  const descriptionError = validateComponentDescription(description);
  if (descriptionError) return { ok: false, status: 400, error: descriptionError };

  const price = parseComponentPrice(String(body.price ?? "0"));
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

export type CreateUploadUrlResult =
  | { ok: true; path: string; token: string }
  | { ok: false; status: number; error: string };

// The narrow slice of the Supabase client createUploadUrl touches.
export type CreateUploadUrlStorage = {
  storage: {
    from(bucket: string): {
      createSignedUploadUrl(
        path: string
      ): Promise<{ data: { token: string } | null; error: { message: string } | null }>;
    };
  };
};

// Mint a one-time signed upload URL so the browser can upload the zip
// DIRECTLY to Supabase Storage (good for 10MB — never flows through the
// API route). The object path is namespaced under the seller's profile id,
// which parsePublishInput/parseEditInput later verify to prevent path
// hijacking.
export async function createUploadUrl(
  supabase: CreateUploadUrlStorage,
  bucket: string,
  sellerId: string
): Promise<CreateUploadUrlResult> {
  const path = `${sellerId}/${randomUUID()}.zip`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, status: 500, error: "Could not create upload URL." };
  }
  return { ok: true, path, token: data.token };
}

export type VerifyUploadResult =
  | { ok: true; sizeBytes: number | null }
  | { ok: false; status: number; error: string };

// The narrow slice of the Supabase client verifyUploadedZip touches.
export type VerifyUploadedZipStorage = {
  storage: {
    from(bucket: string): {
      list(
        folder: string,
        opts: { search: string }
      ): PromiseLike<{ data: { name: string; metadata?: { size?: number } }[] | null }>;
      remove(paths: string[]): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

// Confirms the signed upload actually landed in storage, and enforces the
// size cap against the REAL uploaded size — not just what the client
// claimed when the upload URL was minted. Cleans up an oversized object so
// it doesn't linger. Shared by publish and edit — either can replace the
// zip, and both need the same real-size enforcement.
export async function verifyUploadedZip(
  supabase: VerifyUploadedZipStorage,
  bucket: string,
  zipPath: string
): Promise<VerifyUploadResult> {
  const folder = zipPath.split("/")[0];
  const fileName = zipPath.split("/").slice(1).join("/");
  const { data: listed } = await supabase.storage.from(bucket).list(folder, { search: fileName });
  const obj = listed?.find((o) => o.name === fileName);
  if (!obj) {
    return { ok: false, status: 400, error: "Uploaded file not found. Try again." };
  }

  const sizeBytes = obj.metadata?.size ?? null;
  if (sizeBytes !== null && exceedsZipSizeLimit(sizeBytes)) {
    // Clean up the oversized object so it doesn't linger.
    await supabase.storage.from(bucket).remove([zipPath]);
    return { ok: false, status: 413, error: "Zip exceeds the 10MB limit." };
  }

  return { ok: true, sizeBytes };
}

// The narrow slice of the Supabase client relinkTags touches — shared by
// publishComponent and updateComponent, the one part of the two flows that
// was byte-identical (this was two independent copies before).
type RelinkTagsDb = {
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

type RelinkTagsResult = { ok: true } | { ok: false; error: string };

// Normalize + link free-form tags. `wipeExisting` deletes the component's
// current links first — publish has none to wipe yet; edit does, since a
// seller may have removed a tag. Skips tag work entirely when `tagNames` is
// empty, but still performs the wipe (that's how a seller removes all tags
// on edit).
async function relinkTags(
  supabase: RelinkTagsDb,
  componentId: string,
  tagNames: string[],
  opts: { wipeExisting: boolean }
): Promise<RelinkTagsResult> {
  if (opts.wipeExisting) {
    const { error: unlinkErr } = await supabase
      .from("component_tags")
      .delete()
      .eq("component_id", componentId);
    if (unlinkErr) return { ok: false, error: "clearing old tags failed." };
  }

  if (tagNames.length === 0) return { ok: true };

  const { data: tagRows, error: tagsErr } = await supabase
    .from("tags")
    .upsert(
      tagNames.map((name) => ({ name })),
      { onConflict: "name" }
    )
    .select("id, name");

  if (tagsErr) return { ok: false, error: "saving tags failed." };

  if (tagRows && tagRows.length > 0) {
    const { error: linkErr } = await supabase.from("component_tags").insert(
      tagRows.map((t) => ({ component_id: componentId, tag_id: t.id }))
    );
    if (linkErr) return { ok: false, error: "linking tags failed." };
  }

  return { ok: true };
}

export type PublishResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; status: number; error: string };

// The narrow slice of the Supabase client publishComponent touches.
export type PublishComponentDb = RelinkTagsDb & {
  from(table: "components"): {
    insert(row: TablesInsert<"components">): {
      select(columns: string): {
        single(): PromiseLike<{ data: Pick<Tables<"components">, "id"> | null; error: { message: string } | null }>;
      };
    };
  };
};

// Inserts the component row and links its tags. Tag-linking used to be
// silently swallowed — the insert error wasn't even destructured, so a
// failed link left a published component with zero tags and nothing
// telling the seller. Both writes are checked here; a tag failure is
// reported even though the component itself (already live) can't be rolled
// back without a transaction — better a visible partial failure than an
// invisible one.
export async function publishComponent(
  supabase: PublishComponentDb,
  args: PublishInput & { sellerId: string; sizeBytes: number | null }
): Promise<PublishResult> {
  const slug = `${slugify(args.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: component, error: insertErr } = await supabase
    .from("components")
    .insert({
      seller_id: args.sellerId,
      name: args.name,
      slug,
      description: args.description,
      readme: args.readme,
      ecosystems: args.ecosystems,
      price_cents: args.priceCents,
      currency: "usd",
      zip_path: args.zipPath,
      zip_size_bytes: args.sizeBytes,
      status: "published",
    })
    .select("id")
    .single();

  if (insertErr || !component) {
    return { ok: false, status: 500, error: insertErr?.message ?? "Could not publish." };
  }

  const relinked = await relinkTags(supabase, component.id, args.tagNames, { wipeExisting: false });
  if (!relinked.ok) {
    return { ok: false, status: 500, error: `Component published, but ${relinked.error}` };
  }

  // Return the slug we generated, not the round-tripped column — the
  // column is nullable in the schema, but we always supply it on insert.
  return { ok: true, id: component.id, slug };
}

export type OwnedComponent = Pick<Tables<"components">, "id" | "seller_id" | "zip_path">;

// The one rule for "does this seller own this component" — shared by
// updateComponent's own check below and by the edit page's pre-render check
// (app/dashboard/seller/[id]/edit/page.tsx), which return different things
// on a mismatch (403 here, a 404 there, deliberately — see that page) but
// must never disagree about what ownership means.
export function isOwnedBySeller(component: Pick<Tables<"components">, "seller_id">, sellerId: string): boolean {
  return component.seller_id === sellerId;
}

// The narrow slice of the Supabase client updateComponent touches.
export type UpdateComponentDb = RelinkTagsDb & {
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
  if (!isOwnedBySeller(existing, args.sellerId)) {
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

  const relinked = await relinkTags(supabase, args.componentId, args.tagNames, { wipeExisting: true });
  if (!relinked.ok) {
    return { ok: false, status: 500, error: `Component updated, but ${relinked.error}` };
  }

  return {
    ok: true,
    id: args.componentId,
    oldZipPath: existing.zip_path ?? null,
    newZipPath: args.zipPath ?? null,
  };
}
