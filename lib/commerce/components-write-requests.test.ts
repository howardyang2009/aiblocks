import { describe, it, expect } from "vitest";
import {
  publishComponentRequest,
  editComponentRequest,
  type PublishRequestDeps,
  type EditRequestDeps,
} from "@/lib/commerce/components-write";

// The Publish and Edit operations as whole sequences. Each fake records
// its call in `log`, so the tests can check order, not just outcome.

const body = { name: "Widget", description: "Does things", readme: "", price: "0", zipPath: "s1/new.zip" };

function publishDeps(overrides: Partial<PublishRequestDeps> = {}) {
  const log: string[] = [];
  const deps: PublishRequestDeps = {
    verifyZip: async (p) => (log.push(`verify ${p}`), { ok: true, sizeBytes: 10 }),
    publish: async (a) => (log.push(`publish ${a.sizeBytes}`), { ok: true, id: "c1", slug: "widget-ab" }),
    queueTranslations: (id) => void log.push(`queue ${id}`),
    ...overrides,
  };
  return { deps, log };
}

function editDeps(overrides: Partial<EditRequestDeps> = {}, updated: Partial<{ oldZipPath: string | null; newZipPath: string | null; sourceLanguageChanged: boolean }> = {}) {
  const log: string[] = [];
  const deps: EditRequestDeps = {
    verifyZip: async (p) => (log.push(`verify ${p}`), { ok: true, sizeBytes: 20 }),
    update: async (a) => (
      log.push(`update ${a.sizeBytes}`),
      { ok: true, id: "c1", oldZipPath: null, newZipPath: null, sourceLanguageChanged: false, ...updated }
    ),
    markSourceLanguageChanged: async (id) => void log.push(`mark ${id}`),
    queueTranslations: (id) => void log.push(`queue ${id}`),
    removeZip: async (p) => void log.push(`remove ${p}`),
    ...overrides,
  };
  return { deps, log };
}

describe("publishComponentRequest", () => {
  it("verifies, publishes with the real size, then queues Translations", async () => {
    const { deps, log } = publishDeps();
    expect(await publishComponentRequest(deps, { body, sellerId: "s1" })).toEqual({ ok: true, id: "c1", slug: "widget-ab" });
    expect(log).toEqual(["verify s1/new.zip", "publish 10", "queue c1"]);
  });

  it("rejects invalid input before touching storage", async () => {
    const { deps, log } = publishDeps();
    const result = await publishComponentRequest(deps, { body, sellerId: "someone-else" });
    expect(result).toMatchObject({ ok: false, status: 403, error: "uploadPathMismatch" });
    expect(log).toEqual([]);
  });

  it("stops when the upload is missing", async () => {
    const { deps, log } = publishDeps({ verifyZip: async () => ({ ok: false, status: 400, error: "uploadNotFound" }) });
    expect(await publishComponentRequest(deps, { body, sellerId: "s1" })).toMatchObject({ ok: false, error: "uploadNotFound" });
    expect(log).toEqual([]);
  });

  it("does not queue Translations when the insert fails", async () => {
    const { deps, log } = publishDeps({ publish: async () => ({ ok: false, status: 500, error: "publishFailed" }) });
    expect(await publishComponentRequest(deps, { body, sellerId: "s1" })).toMatchObject({ ok: false, error: "publishFailed" });
    expect(log).toEqual(["verify s1/new.zip"]);
  });
});

describe("editComponentRequest", () => {
  const args = { componentId: "c1", sellerId: "s1" };

  it("skips zip verification and cleanup when the zip was kept", async () => {
    const { deps, log } = editDeps();
    const { zipPath: _kept, ...metadataOnly } = body;
    expect(await editComponentRequest(deps, { ...args, body: metadataOnly })).toEqual({ ok: true, id: "c1" });
    expect(log).toEqual(["update null", "queue c1"]);
  });

  it("marks Translations before queueing when the source language changed", async () => {
    const { deps, log } = editDeps({}, { sourceLanguageChanged: true });
    await editComponentRequest(deps, { ...args, body: { ...body, sourceLanguage: "de" } });
    expect(log.indexOf("mark c1")).toBeLessThan(log.indexOf("queue c1"));
  });

  it("removes the old zip only after a successful update", async () => {
    const { deps, log } = editDeps({}, { oldZipPath: "s1/old.zip", newZipPath: "s1/new.zip" });
    await editComponentRequest(deps, { ...args, body });
    expect(log).toEqual(["verify s1/new.zip", "update 20", "queue c1", "remove s1/old.zip"]);
  });

  it("leaves both zips alone when the update fails", async () => {
    const { deps, log } = editDeps({ update: async () => ({ ok: false, status: 403, error: "notOwner" }) });
    expect(await editComponentRequest(deps, { ...args, body })).toMatchObject({ ok: false, status: 403, error: "notOwner" });
    expect(log).toEqual(["verify s1/new.zip"]);
  });

  it("still succeeds when removing the old zip throws", async () => {
    const { deps } = editDeps(
      { removeZip: async () => { throw new Error("storage down"); } },
      { oldZipPath: "s1/old.zip", newZipPath: "s1/new.zip" }
    );
    expect(await editComponentRequest(deps, { ...args, body })).toEqual({ ok: true, id: "c1" });
  });
});
