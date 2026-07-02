// Server-only constants — never import this from a "use client" module.
// Resolves the bucket name once so every route uses the same value.
import { ZIP_BUCKET } from "@/lib/constants";

export const ACTIVE_ZIP_BUCKET = process.env.SUPABASE_ZIP_BUCKET ?? ZIP_BUCKET;
