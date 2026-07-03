import "server-only";
// Resolves the bucket name once so every route uses the same value.
import { ZIP_BUCKET } from "@/lib/constants";

export const ACTIVE_ZIP_BUCKET = process.env.SUPABASE_ZIP_BUCKET ?? ZIP_BUCKET;
