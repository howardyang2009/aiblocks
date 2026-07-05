import { describe, it, expect } from "vitest";
import { applyOptimisticToggle, resolveToggle, type StarState } from "@/lib/star-button-state";

describe("applyOptimisticToggle", () => {
  it("stars an unstarred component and increments the count", () => {
    const state: StarState = { starred: false, count: 3 };
    expect(applyOptimisticToggle(state)).toEqual({ starred: true, count: 4 });
  });

  it("unstars a starred component and decrements the count", () => {
    const state: StarState = { starred: true, count: 3 };
    expect(applyOptimisticToggle(state)).toEqual({ starred: false, count: 2 });
  });

  it("does not clamp below zero — that's the server's job, not this function's", () => {
    const state: StarState = { starred: true, count: 0 };
    expect(applyOptimisticToggle(state)).toEqual({ starred: false, count: -1 });
  });
});

describe("resolveToggle", () => {
  it("confirms the optimistic state when the request succeeds", () => {
    const previous: StarState = { starred: false, count: 3 };
    const optimistic: StarState = { starred: true, count: 4 };
    expect(resolveToggle(previous, optimistic, true)).toBe(optimistic);
  });

  it("reverts to the prior state when the request fails", () => {
    const previous: StarState = { starred: false, count: 3 };
    const optimistic: StarState = { starred: true, count: 4 };
    expect(resolveToggle(previous, optimistic, false)).toBe(previous);
  });

  it("round-trips through apply then resolve(false) back to the exact starting state", () => {
    const previous: StarState = { starred: true, count: 7 };
    const optimistic = applyOptimisticToggle(previous);
    expect(resolveToggle(previous, optimistic, false)).toEqual(previous);
  });
});
