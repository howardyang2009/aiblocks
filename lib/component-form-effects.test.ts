import { describe, it, expect, vi } from "vitest";
import {
  requestUploadUrl,
  uploadZip,
  createComponentEffect,
  updateComponentEffect,
  type UploadZipStorage,
} from "@/lib/component-form-effects";

function fakeFetch(response: { ok: boolean; body: unknown }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body,
  })) as unknown as typeof fetch;
}

describe("requestUploadUrl", () => {
  it("POSTs the size and shapes a successful response", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { path: "seller1/x.zip", token: "tok", bucket: "component-zips" } });

    const result = await requestUploadUrl(fetchImpl, 2048);

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: 2048 }),
    });
    expect(result).toEqual({ ok: true, path: "seller1/x.zip", token: "tok", bucket: "component-zips" });
  });

  it("surfaces the server's error message on failure", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: { error: "Zip exceeds the 10MB limit." } });

    const result = await requestUploadUrl(fetchImpl, 99_000_000);

    expect(result).toEqual({ ok: false, error: "Zip exceeds the 10MB limit." });
  });

  it("falls back to a generic error when the server sends none", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: {} });

    const result = await requestUploadUrl(fetchImpl, 2048);

    expect(result).toEqual({ ok: false, error: "Could not start upload." });
  });
});

function fakeStorage(opts: { error?: { message: string } | null }): UploadZipStorage & {
  _uploadToSignedUrl: ReturnType<typeof vi.fn>;
} {
  const uploadToSignedUrl = vi.fn(async () => ({ error: opts.error ?? null }));
  const storage = {
    storage: { from: () => ({ uploadToSignedUrl }) },
  } as unknown as UploadZipStorage & { _uploadToSignedUrl: typeof uploadToSignedUrl };
  storage._uploadToSignedUrl = uploadToSignedUrl;
  return storage;
}

describe("uploadZip", () => {
  it("uploads to the signed URL and reports success", async () => {
    const storage = fakeStorage({});
    const file = { name: "widget.zip" } as unknown as File;

    const result = await uploadZip(storage, "component-zips", "seller1/x.zip", "tok", file);

    expect(storage._uploadToSignedUrl).toHaveBeenCalledWith("seller1/x.zip", "tok", file);
    expect(result).toEqual({ ok: true });
  });

  it("reports a fixed error message when the upload fails", async () => {
    const storage = fakeStorage({ error: { message: "network blip" } });
    const file = { name: "widget.zip" } as unknown as File;

    const result = await uploadZip(storage, "component-zips", "seller1/x.zip", "tok", file);

    expect(result).toEqual({ ok: false, error: "Upload failed. Please try again." });
  });
});

const publishPayload = {
  name: "Widget",
  description: "A widget",
  readme: "",
  ecosystems: "claude",
  tags: "agent",
  price: "0",
  zipPath: "seller1/x.zip",
};

describe("createComponentEffect", () => {
  it("POSTs the payload and returns the new id", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { id: "comp1" } });

    const result = await createComponentEffect(fetchImpl, publishPayload);

    expect(fetchImpl).toHaveBeenCalledWith("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publishPayload),
    });
    expect(result).toEqual({ ok: true, id: "comp1" });
  });

  it("surfaces the server's error message on failure", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: { error: "Name must be at least 3 characters." } });

    const result = await createComponentEffect(fetchImpl, publishPayload);

    expect(result).toEqual({ ok: false, error: "Name must be at least 3 characters." });
  });

  it("falls back to a generic error when the server sends none", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: {} });

    const result = await createComponentEffect(fetchImpl, publishPayload);

    expect(result).toEqual({ ok: false, error: "Could not publish." });
  });
});

const editPayload = {
  name: "Widget",
  description: "A widget, edited",
  readme: "",
  ecosystems: "claude",
  tags: "agent",
  price: "0",
};

describe("updateComponentEffect", () => {
  it("PATCHes the payload and returns the id", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { id: "comp1" } });

    const result = await updateComponentEffect(fetchImpl, "comp1", editPayload);

    expect(fetchImpl).toHaveBeenCalledWith("/api/components/comp1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editPayload),
    });
    expect(result).toEqual({ ok: true, id: "comp1" });
  });

  it("surfaces the server's error message on failure", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: { error: "You can only edit your own components." } });

    const result = await updateComponentEffect(fetchImpl, "comp1", editPayload);

    expect(result).toEqual({ ok: false, error: "You can only edit your own components." });
  });

  it("falls back to a generic error when the server sends none", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: {} });

    const result = await updateComponentEffect(fetchImpl, "comp1", editPayload);

    expect(result).toEqual({ ok: false, error: "Could not save changes." });
  });
});
