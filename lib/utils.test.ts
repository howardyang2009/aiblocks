import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/utils";

describe("formatPrice", () => {
  it("defaults to euros", () => {
    expect(formatPrice(500)).toBe("€5.00");
  });

  it("formats an explicit currency, such as a Purchase charged in USD", () => {
    expect(formatPrice(500, "usd")).toBe("$5.00");
  });
});
