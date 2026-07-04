import { MAX_BODY_LENGTH } from "@/lib/constants";
import type { Result } from "@/lib/result";

export type BodyValidation = Result<{ value: string }>;

// Trim + length-check a user-generated text body (comment, review, seller
// reply). `required: false` allows an empty string through (reviews: the
// rating is required, the write-up isn't).
export function validateBody(
  raw: unknown,
  opts: { required: boolean; label: string }
): BodyValidation {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (opts.required && !value) {
    return { ok: false, status: 400, error: `${opts.label} is required.` };
  }
  if (value.length > MAX_BODY_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `${opts.label} must be ${MAX_BODY_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value };
}
