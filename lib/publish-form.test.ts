import { describe, it, expect, vi } from "vitest";
import { validatePublishForm, runPublishFlow, type PublishFormFields, type PublishFlowDeps } from "@/lib/publish-form";

function smallFile(size = 1024): File {
  return { size, name: "widget.zip" } as unknown as File;
}

function validFields(overrides: Partial<PublishFormFields> = {}): PublishFormFields {
  return {
    name: "Email Triage Agent",
    description: "Triages your inbox automatically",
    readme: "# Overview",
    ecosystems: "claude, gpt",
    tags: "agent, email",
    price: "9.99",
    file: smallFile(),
    ...overrides,
  };
}

describe("validatePublishForm", () => {
  it("accepts a valid submission", () => {
    expect(validatePublishForm(validFields())).toEqual({ ok: true });
  });

  it("rejects a name under 3 characters", () => {
    expect(validatePublishForm(validFields({ name: "ab" }))).toEqual({
      ok: false,
      error: "Name must be at least 3 characters.",
    });
  });

  it("rejects a description under 10 characters", () => {
    expect(validatePublishForm(validFields({ description: "too short" }))).toEqual({
      ok: false,
      error: "Add a short description (10+ characters).",
    });
  });

  it("rejects a missing file", () => {
    expect(validatePublishForm(validFields({ file: null }))).toEqual({
      ok: false,
      error: "Choose a zip file to upload.",
    });
  });

  it("rejects a file over the 10MB limit", () => {
    expect(validatePublishForm(validFields({ file: smallFile(20 * 1024 * 1024) }))).toEqual({
      ok: false,
      error: "Zip exceeds the 10MB limit.",
    });
  });

  it("rejects a negative price — the check the form used to skip", () => {
    expect(validatePublishForm(validFields({ price: "-5" }))).toEqual({
      ok: false,
      error: "Price must be 0 or a positive number.",
    });
  });

  it("rejects a non-numeric price", () => {
    expect(validatePublishForm(validFields({ price: "free plz" }))).toEqual({
      ok: false,
      error: "Price must be 0 or a positive number.",
    });
  });
});

function fakeDeps(overrides: Partial<PublishFlowDeps> = {}): PublishFlowDeps {
  return {
    requestUploadUrl: vi.fn(async () => ({ ok: true as const, path: "seller1/widget.zip", token: "tok", bucket: "component-zips" })),
    uploadZip: vi.fn(async () => ({ ok: true as const })),
    createComponent: vi.fn(async () => ({ ok: true as const, id: "comp1" })),
    ...overrides,
  };
}

describe("runPublishFlow", () => {
  it("runs upload-url -> upload -> create in order and returns the new id", async () => {
    const deps = fakeDeps();
    const result = await runPublishFlow(deps, validFields());

    expect(result).toEqual({ status: "done", id: "comp1" });
    expect(deps.createComponent).toHaveBeenCalledWith({
      name: "Email Triage Agent",
      description: "Triages your inbox automatically",
      readme: "# Overview",
      ecosystems: "claude, gpt",
      tags: "agent, email",
      price: "9.99",
      zipPath: "seller1/widget.zip",
    });
  });

  it("short-circuits on invalid input without calling any dep", async () => {
    const deps = fakeDeps();
    const result = await runPublishFlow(deps, validFields({ name: "ab" }));

    expect(result).toEqual({ status: "error", error: "Name must be at least 3 characters." });
    expect(deps.requestUploadUrl).not.toHaveBeenCalled();
  });

  it("stops before uploading when minting the upload url fails", async () => {
    const deps = fakeDeps({ requestUploadUrl: vi.fn(async () => ({ ok: false as const, error: "Could not start upload." })) });
    const result = await runPublishFlow(deps, validFields());

    expect(result).toEqual({ status: "error", error: "Could not start upload." });
    expect(deps.uploadZip).not.toHaveBeenCalled();
  });

  it("stops before creating the component when the upload fails", async () => {
    const deps = fakeDeps({ uploadZip: vi.fn(async () => ({ ok: false as const, error: "Upload failed. Please try again." })) });
    const result = await runPublishFlow(deps, validFields());

    expect(result).toEqual({ status: "error", error: "Upload failed. Please try again." });
    expect(deps.createComponent).not.toHaveBeenCalled();
  });

  it("reports the error when creating the component fails", async () => {
    const deps = fakeDeps({ createComponent: vi.fn(async () => ({ ok: false as const, error: "Could not publish." })) });
    const result = await runPublishFlow(deps, validFields());

    expect(result).toEqual({ status: "error", error: "Could not publish." });
  });

  it("reports upload then saving stages in order", async () => {
    const stages: string[] = [];
    const deps = fakeDeps({ onStage: (stage) => stages.push(stage) });
    await runPublishFlow(deps, validFields());

    expect(stages).toEqual(["uploading", "saving"]);
  });

  it("never reports a stage when validation fails first", async () => {
    const stages: string[] = [];
    const deps = fakeDeps({ onStage: (stage) => stages.push(stage) });
    await runPublishFlow(deps, validFields({ name: "ab" }));

    expect(stages).toEqual([]);
  });
});
