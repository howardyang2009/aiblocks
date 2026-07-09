import { describe, it, expect } from "vitest";
import { toResponse } from "@/lib/result";

describe("toResponse", () => {
  it("shapes a failed result into its status and error body", async () => {
    const res = toResponse({ ok: false, status: 404, error: "Component not found." });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Component not found." });
  });

  it("carries a 500 through the same way as any other status", async () => {
    const res = toResponse({ ok: false, status: 500, error: "Could not delete the comment. Try again." });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not delete the comment. Try again." });
  });
});
