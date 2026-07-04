import { describe, it, expect } from "vitest";
import { validateBody } from "@/lib/validation";
import { MAX_BODY_LENGTH } from "@/lib/constants";

describe("validateBody", () => {
  it("trims and accepts a normal body", () => {
    const result = validateBody("  hello  ", { required: true, label: "Comment text" });
    expect(result).toEqual({ ok: true, value: "hello" });
  });

  it("rejects a missing body when required", () => {
    const result = validateBody(undefined, { required: true, label: "Comment text" });
    expect(result).toEqual({ ok: false, status: 400, error: "Comment text is required." });
  });

  it("rejects whitespace-only body when required", () => {
    const result = validateBody("   ", { required: true, label: "Reply text" });
    expect(result).toEqual({ ok: false, status: 400, error: "Reply text is required." });
  });

  it("allows an empty body when not required", () => {
    const result = validateBody(undefined, { required: false, label: "Review text" });
    expect(result).toEqual({ ok: true, value: "" });
  });

  it("rejects a body over the max length", () => {
    const tooLong = "a".repeat(MAX_BODY_LENGTH + 1);
    const result = validateBody(tooLong, { required: true, label: "Comment text" });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: `Comment text must be ${MAX_BODY_LENGTH} characters or fewer.`,
    });
  });

  it("accepts a body exactly at the max length", () => {
    const exact = "a".repeat(MAX_BODY_LENGTH);
    const result = validateBody(exact, { required: true, label: "Comment text" });
    expect(result).toEqual({ ok: true, value: exact });
  });

  it("treats a non-string value as empty", () => {
    const result = validateBody(42, { required: true, label: "Comment text" });
    expect(result).toEqual({ ok: false, status: 400, error: "Comment text is required." });
  });
});
