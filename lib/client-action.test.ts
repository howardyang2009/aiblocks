import { describe, it, expect, vi } from "vitest";
import { runClientAction } from "@/lib/client-action";

function fakeFetch(response: { ok: boolean; body?: unknown; jsonError?: boolean }): typeof fetch {
  return vi.fn(async () => ({
    ok: response.ok,
    json: async () => {
      if (response.jsonError) throw new Error("Unexpected end of JSON input");
      return response.body;
    },
  })) as unknown as typeof fetch;
}

function throwingFetch(): typeof fetch {
  return vi.fn(async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
}

const messages = { fallback: "Could not do the thing.", network: "Network error — the thing failed." };

describe("runClientAction", () => {
  it("passes the url and init through to fetchImpl unchanged", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { id: "x1" } });
    const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };

    await runClientAction(fetchImpl, "/api/things", init, messages);

    expect(fetchImpl).toHaveBeenCalledWith("/api/things", init);
  });

  it("returns the parsed body as data on success", async () => {
    const fetchImpl = fakeFetch({ ok: true, body: { id: "x1" } });

    const result = await runClientAction<{ id: string }>(fetchImpl, "/api/things", undefined, messages);

    expect(result).toEqual({ ok: true, data: { id: "x1" } });
  });

  it("treats an unparseable body on success as an empty object (e.g. a DELETE with no response body)", async () => {
    const fetchImpl = fakeFetch({ ok: true, jsonError: true });

    const result = await runClientAction<Record<string, never>>(
      fetchImpl,
      "/api/things/1",
      { method: "DELETE" },
      messages
    );

    expect(result).toEqual({ ok: true, data: {} });
  });

  it("surfaces the server's error message on failure", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: { error: "Specific reason." } });

    const result = await runClientAction(fetchImpl, "/api/things", undefined, messages);

    expect(result).toEqual({ ok: false, error: "Specific reason." });
  });

  it("falls back to the provided message when the server sends no error field", async () => {
    const fetchImpl = fakeFetch({ ok: false, body: {} });

    const result = await runClientAction(fetchImpl, "/api/things", undefined, messages);

    expect(result).toEqual({ ok: false, error: "Could not do the thing." });
  });

  it("falls back to the provided message when the failure response body isn't parseable JSON", async () => {
    const fetchImpl = fakeFetch({ ok: false, jsonError: true });

    const result = await runClientAction(fetchImpl, "/api/things", undefined, messages);

    expect(result).toEqual({ ok: false, error: "Could not do the thing." });
  });

  it("returns the network message when fetchImpl throws", async () => {
    const fetchImpl = throwingFetch();

    const result = await runClientAction(fetchImpl, "/api/things", undefined, messages);

    expect(result).toEqual({ ok: false, error: "Network error — the thing failed." });
  });
});
