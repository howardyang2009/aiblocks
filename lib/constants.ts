// Shared, non-secret constants used on both client and server.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// The bucket name isn't sensitive; the server may override via env.
export const ZIP_BUCKET = "component-zips";
export const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10MB

// Checked independently at upload time (client), signed-upload-mint time,
// and against the real uploaded size — same threshold, one place to change it.
export function exceedsZipSizeLimit(bytes: number): boolean {
  return bytes > MAX_ZIP_BYTES;
}

// Maximum character length for user-generated text bodies (comments, reviews,
// seller replies). Mirrored by DB CHECK constraints in migration 0004.
export const MAX_BODY_LENGTH = 2000;

// Columns fetched for component summary cards (browse, search, seller profile,
// downloads library). Matches the ComponentSummary type in types/database.ts.
export const COMPONENT_SUMMARY_COLS =
  "id, name, description, ecosystems, price_cents, currency, star_count, download_count" as const;
