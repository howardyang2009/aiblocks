import { describe, it, expect, vi } from "vitest";
import {
  requestUploadUrl,
  uploadZip,
  createComponentEffect,
  updateComponentEffect,
  type UploadZipStorage,
} from "@/lib/commerce/component-form-effects";

// requestUploadUrl/createComponentEffect/updateComponentEffect are only
// tested for their own logic here — which URL/method/body they send, and
// how they shape a successful response. The failure paths (server error
// message, fallback, network exception) are runClientAction's behavior,
// already exhaustively covered in lib/client-action.test.ts; each of these
// wrappers forwards that result unchanged on failure. uploadZip is
// different — it doesn't go through runClientAction at all, so both of its
// tests (including its own fixed error message) stay as genuinely new
// coverage.

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
});
