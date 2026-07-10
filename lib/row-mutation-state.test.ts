import { describe, it, expect } from "vitest";
import { markBusy, settle, clearRow, isBusy, errorFor, type RowMap, type RowState } from "@/lib/row-mutation-state";

describe("markBusy", () => {
  it("marks a fresh id busy with no error", () => {
    const rows: RowMap = new Map();
    const next = markBusy(rows, "c1");
    expect(next.get("c1")).toEqual({ busy: true, error: null });
  });

  it("clears a prior error when a row starts running again", () => {
    const rows: RowMap = new Map([["c1", { busy: false, error: "Could not delete." }]]);
    const next = markBusy(rows, "c1");
    expect(next.get("c1")).toEqual({ busy: true, error: null });
  });

  it("leaves other rows untouched", () => {
    const other = { busy: true, error: null };
    const rows: RowMap = new Map([["other", other]]);
    const next = markBusy(rows, "c1");
    expect(next.get("other")).toBe(other);
  });

  it("does not mutate the map passed in", () => {
    const rows: RowMap = new Map();
    markBusy(rows, "c1");
    expect(rows.has("c1")).toBe(false);
  });
});

describe("settle", () => {
  it("stores the error and clears busy when the flow reports an error", () => {
    const rows: RowMap = new Map([["c1", { busy: true, error: null }]]);
    const next = settle(rows, "c1", { status: "error", error: "Could not delete the comment." });
    expect(next.get("c1")).toEqual({ busy: false, error: "Could not delete the comment." });
  });

  it("removes the row entirely on a non-error result — idle means absent", () => {
    const rows: RowMap = new Map([["c1", { busy: true, error: null }]]);
    const next = settle(rows, "c1", { status: "removed" });
    expect(next.has("c1")).toBe(false);
  });

  it("leaves other rows untouched", () => {
    const other: RowState = { busy: true, error: "unrelated" };
    const rows: RowMap = new Map<string, RowState>([
      ["c1", { busy: true, error: null }],
      ["other", other],
    ]);
    const next = settle(rows, "c1", { status: "posted" });
    expect(next.get("other")).toBe(other);
  });

  it("does not mutate the map passed in", () => {
    const rows: RowMap = new Map([["c1", { busy: true, error: null }]]);
    settle(rows, "c1", { status: "error", error: "boom" });
    expect(rows.get("c1")).toEqual({ busy: true, error: null });
  });
});

describe("clearRow", () => {
  it("removes an id's entry", () => {
    const rows: RowMap = new Map([["c1", { busy: false, error: "stale" }]]);
    expect(clearRow(rows, "c1").has("c1")).toBe(false);
  });

  it("is a no-op when the id has no entry", () => {
    const rows: RowMap = new Map();
    expect(clearRow(rows, "c1")).toEqual(new Map());
  });

  it("leaves other rows untouched", () => {
    const other: RowState = { busy: true, error: null };
    const rows: RowMap = new Map<string, RowState>([
      ["c1", { busy: false, error: "stale" }],
      ["other", other],
    ]);
    expect(clearRow(rows, "c1").get("other")).toBe(other);
  });
});

describe("isBusy", () => {
  it("is true for a row mid-flight", () => {
    const rows: RowMap = new Map([["c1", { busy: true, error: null }]]);
    expect(isBusy(rows, "c1")).toBe(true);
  });

  it("is false for a row that settled with an error", () => {
    const rows: RowMap = new Map([["c1", { busy: false, error: "boom" }]]);
    expect(isBusy(rows, "c1")).toBe(false);
  });

  it("is false for an id with no entry", () => {
    const rows: RowMap = new Map();
    expect(isBusy(rows, "c1")).toBe(false);
  });
});

describe("errorFor", () => {
  it("returns the stored error", () => {
    const rows: RowMap = new Map([["c1", { busy: false, error: "Could not delete." }]]);
    expect(errorFor(rows, "c1")).toBe("Could not delete.");
  });

  it("returns null while a row is mid-flight", () => {
    const rows: RowMap = new Map([["c1", { busy: true, error: null }]]);
    expect(errorFor(rows, "c1")).toBe(null);
  });

  it("returns null for an id with no entry", () => {
    const rows: RowMap = new Map();
    expect(errorFor(rows, "c1")).toBe(null);
  });
});
