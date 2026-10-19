import { MAX_BODY_LENGTH } from "@/lib/constants";
import type { ApiError } from "@/lib/api-errors";
import type { Result } from "@/lib/result";

export type BodyValidation = Result<{ value: string }>;

// Trim + length-check a user-generated text body (comment, review, seller
// reply). `required: null` allows an empty string through (reviews: the
// rating is required, the write-up isn't). Failures carry the caller's
// ApiError key, which the client translates.
export function validateBody(
  raw: unknown,
  errors: { required: ApiError | null; tooLong: ApiError }
): BodyValidation {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (errors.required && !value) {
    return { ok: false, status: 400, error: errors.required };
  }
  if (value.length > MAX_BODY_LENGTH) {
    return { ok: false, status: 400, error: errors.tooLong };
  }
  return { ok: true, value };
}
