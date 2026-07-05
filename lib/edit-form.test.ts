import { describe, it, expect, vi } from "vitest";
import {
  validateEditForm,
  runEditFlow,
  type EditFormFields,
  type EditFlowDeps,
} from "@/lib/edit-form";

function smallFile(size = 1024): File {
  return { size, name: "widget.zip" } as unknown as File;
}

function validFields(overrides: Partial<EditFormFields> = {}): EditFormFields {
  return {
    name: "Email Triage Agent",
    description: "Triages your inbox automatically",
    readme: "# Overview",
    ecosystems: "claude, gpt",
    tags: "agent, email",
    price: "9.99",
    file: null, // <- key difference from publish: null is the DEFAULT
    ...overrides,
  };
}

describe("validateEditForm", () => {
  it("accepts a valid submission without a new file (keep-current path)", () => {
    expect(validateEditForm(validFields())).toEqual({ ok: true });
  });

  it("accepts a valid submission with a replacement file under the size cap", () => {
    expect(validateEditForm(validFields({ file: smallFile() }))).toEqual({ ok: true });
  });

  it("rejects a name under 3 characters", () => {
    expect(validateEditForm(validFields({ name: "ab" }))).toEqual({
      ok: false,
      error: "Name must be at least 3 characters.",
    });
  });

  it("rejects a description under 10 characters", () => {
    expect(validateEditForm(validFields({ description: "too short" }))).toEqual({
      ok: false,
      error: "Add a short description (10+ characters).",
    });
  });

  it("rejects a replacement file over the 10MB limit", () => {
    expect(validateEditForm(validFields({ file: smallFile(20 * 1024 * 1024) }))).toEqual({
      ok: false,
      error: "Zip exceeds the 10MB limit.",
    });
  });

  it("rejects a negative price", () => {
    expect(validateEditForm(validFields({ price: "-5" }))).toEqual({
      ok: false,
      error: "Price must be 0 or a positive number.",
    });
  });
});

function fakeDeps(overrides: Partial<EditFlowDeps> = {}): EditFlowDeps {
  return {
    requestUploadUrl: vi.fn(async () => ({ ok: true as const, path: "seller1/new.zip", token: "tok", bucket: "component-zips" })),
    uploadZip: vi.fn(async () => ({ ok: true as const })),
    updateComponent: vi.fn(async () => ({ ok: true as const, id: "comp1" })),
    ...overrides,
  };
}

describe("runEditFlow", () => {
  it("SKIPS upload entirely when no new file is provided", async () => {
    const deps = fakeDeps();
    const result = await runEditFlow(deps, "comp1", validFields());

    expect(result).toEqual({ status: "done", id: "comp1" });
    expect(deps.requestUploadUrl).not.toHaveBeenCalled();
    expect(deps.uploadZip).not.toHaveBeenCalled();
    // updateComponent is called WITHOUT zipPath (server keeps the current zip).
    expect(deps.updateComponent).toHaveBeenCalledWith("comp1", {
      name: "Email Triage Agent",
      description: "Triages your inbox automatically",
      readme: "# Overview",
      ecosystems: "claude, gpt",
      tags: "agent, email",
      price: "9.99",
    });
  });

  it("uploads first, then updates with the new zipPath, when a file IS provided", async () => {
    const deps = fakeDeps();
    const result = await runEditFlow(deps, "comp1", validFields({ file: smallFile() }));

    expect(result).toEqual({ status: "done", id: "comp1" });
    expect(deps.requestUploadUrl).toHaveBeenCalledOnce();
    expect(deps.uploadZip).toHaveBeenCalledOnce();
    expect(deps.updateComponent).toHaveBeenCalledWith("comp1", {
      name: "Email Triage Agent",
      description: "Triages your inbox automatically",
      readme: "# Overview",
      ecosystems: "claude, gpt",
      tags: "agent, email",
      price: "9.99",
      zipPath: "seller1/new.zip",
    });
  });

  it("short-circuits on invalid input without calling any dep", async () => {
    const deps = fakeDeps();
    const result = await runEditFlow(deps, "comp1", validFields({ name: "ab" }));

    expect(result).toEqual({ status: "error", error: "Name must be at least 3 characters." });
    expect(deps.requestUploadUrl).not.toHaveBeenCalled();
    expect(deps.updateComponent).not.toHaveBeenCalled();
  });

  it("stops before uploading when minting the upload url fails", async () => {
    const deps = fakeDeps({ requestUploadUrl: vi.fn(async () => ({ ok: false as const, error: "Could not start upload." })) });
    const result = await runEditFlow(deps, "comp1", validFields({ file: smallFile() }));

    expect(result).toEqual({ status: "error", error: "Could not start upload." });
    expect(deps.uploadZip).not.toHaveBeenCalled();
    expect(deps.updateComponent).not.toHaveBeenCalled();
  });

  it("stops before updating when the upload fails", async () => {
    const deps = fakeDeps({ uploadZip: vi.fn(async () => ({ ok: false as const, error: "Upload failed. Please try again." })) });
    const result = await runEditFlow(deps, "comp1", validFields({ file: smallFile() }));

    expect(result).toEqual({ status: "error", error: "Upload failed. Please try again." });
    expect(deps.updateComponent).not.toHaveBeenCalled();
  });

  it("reports the error when updating fails", async () => {
    const deps = fakeDeps({ updateComponent: vi.fn(async () => ({ ok: false as const, error: "Could not save changes." })) });
    const result = await runEditFlow(deps, "comp1", validFields());

    expect(result).toEqual({ status: "error", error: "Could not save changes." });
  });

  it("reports upload then saving stages in order when a file IS provided", async () => {
    const stages: string[] = [];
    const deps = fakeDeps({ onStage: (stage) => stages.push(stage) });
    await runEditFlow(deps, "comp1", validFields({ file: smallFile() }));

    expect(stages).toEqual(["uploading", "saving"]);
  });

  it("reports only the saving stage when no file is provided", async () => {
    const stages: string[] = [];
    const deps = fakeDeps({ onStage: (stage) => stages.push(stage) });
    await runEditFlow(deps, "comp1", validFields());

    expect(stages).toEqual(["saving"]);
  });

  it("never reports a stage when validation fails first", async () => {
    const stages: string[] = [];
    const deps = fakeDeps({ onStage: (stage) => stages.push(stage) });
    await runEditFlow(deps, "comp1", validFields({ name: "ab" }));

    expect(stages).toEqual([]);
  });
});
