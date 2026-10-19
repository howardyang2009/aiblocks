import { describe, it, expect } from "vitest";
import { validateBody } from "@/lib/validation";
import { MAX_BODY_LENGTH } from "@/lib/constants";

const comment = { required: "commentRequired", tooLong: "commentTooLong" } as const;

describe("validateBody", () => {
  it("trims and accepts a normal body", () => {
    const result = validateBody("  hello  ", comment);
    expect(result).toEqual({ ok: true, value: "hello" });
  });

  it("rejects a missing body when required", () => {
    const result = validateBody(undefined, comment);
    expect(result).toEqual({ ok: false, status: 400, error: "commentRequired" });
  });

  it("rejects whitespace-only body when required", () => {
    const result = validateBody("   ", { required: "replyRequired", tooLong: "replyTooLong" });
    expect(result).toEqual({ ok: false, status: 400, error: "replyRequired" });
  });

  it("allows an empty body when not required", () => {
    const result = validateBody(undefined, { required: null, tooLong: "reviewTooLong" });
    expect(result).toEqual({ ok: true, value: "" });
  });

  it("rejects a body over the max length", () => {
    const tooLong = "a".repeat(MAX_BODY_LENGTH + 1);
    const result = validateBody(tooLong, comment);
    expect(result).toEqual({ ok: false, status: 400, error: "commentTooLong" });
  });

  it("accepts a body exactly at the max length", () => {
    const exact = "a".repeat(MAX_BODY_LENGTH);
    const result = validateBody(exact, comment);
    expect(result).toEqual({ ok: true, value: exact });
  });

  it("treats a non-string value as empty", () => {
    const result = validateBody(42, comment);
    expect(result).toEqual({ ok: false, status: 400, error: "commentRequired" });
  });
});
