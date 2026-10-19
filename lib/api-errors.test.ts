import { describe, it, expect } from "vitest";
import { isApiError } from "@/lib/api-errors";

describe("isApiError", () => {
  it("recognises the shared helper keys", () => {
    expect(isApiError("signInRequired")).toBe(true);
    expect(isApiError("invalidBody")).toBe(true);
  });

  it("rejects anything else, including route-specific text", () => {
    expect(isApiError("Comment not found.")).toBe(false);
    expect(isApiError("nameTooShort")).toBe(false);
  });
});
