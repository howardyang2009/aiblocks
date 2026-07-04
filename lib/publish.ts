import { randomUUID } from "crypto";
import type { Tables, TablesInsert } from "@/types/database";
import { slugify, parseList } from "@/lib/utils";
import { exceedsZipSizeLimit } from "@/lib/constants";

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

  if (name.length < 3) {
    return { ok: false, status: 400, error: "Name must be at least 3 characters." };
  }
  if (description.length < 10) {
    return { ok: false, status: 400, error: "Add a short description (10+ characters)." };
  }
  if (!zipPath) {
    return { ok: false, status: 400, error: "Upload a zip before publishing." };
  }
  // The uploaded object must live under THIS seller's namespace.
  if (!zipPath.startsWith(`${sellerId}/`)) {
    return { ok: false, status: 403, error: "Upload path mismatch." };
  }

  // Price: accept dollars, store integer cents.
  const dollars = parseFloat(String(body.price ?? "0"));
  if (Number.isNaN(dollars) || dollars < 0) {
    return { ok: false, status: 400, error: "Price must be 0 or a positive number." };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      readme,
      zipPath,
      priceCents: Math.round(dollars * 100),
      ecosystems: parseList(body.ecosystems),
      tagNames: parseList(body.tags),
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
// which parsePublishInput later verifies to prevent path hijacking.
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
// it doesn't linger.
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

export type PublishResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; status: number; error: string };

// The narrow slice of the Supabase client publishComponent touches.
export type PublishComponentDb = {
  from(table: "components"): {
    insert(row: TablesInsert<"components">): {
      select(columns: string): {
        single(): PromiseLike<{ data: Pick<Tables<"components">, "id"> | null; error: { message: string } | null }>;
      };
    };
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
  from(table: "component_tags"): {
    insert(rows: { component_id: string; tag_id: string }[]): PromiseLike<{ error: { message: string } | null }>;
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

  // Normalize + link tags (free-form, deduped).
  if (args.tagNames.length > 0) {
    const { data: tagRows, error: tagsErr } = await supabase
      .from("tags")
      .upsert(
        args.tagNames.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id, name");

    if (tagsErr) {
      return { ok: false, status: 500, error: "Component published, but saving tags failed." };
    }

    if (tagRows && tagRows.length > 0) {
      const { error: linkErr } = await supabase.from("component_tags").insert(
        tagRows.map(t => ({ component_id: component.id, tag_id: t.id }))
      );
      if (linkErr) {
        return { ok: false, status: 500, error: "Component published, but linking tags failed." };
      }
    }
  }

  // Return the slug we generated, not the round-tripped column — the
  // column is nullable in the schema, but we always supply it on insert.
  return { ok: true, id: component.id, slug };
}
