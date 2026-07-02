// Shared, non-secret constants used on both client and server.
// The bucket name isn't sensitive; the server may override via env.
export const ZIP_BUCKET = "component-zips";
export const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10MB

// Maximum character length for user-generated text bodies (comments, reviews,
// seller replies). Mirrored by DB CHECK constraints in migration 0004.
export const MAX_BODY_LENGTH = 2000;
