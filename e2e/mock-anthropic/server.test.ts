import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { translateText } from "@/lib/translation/claude";
import { startMockAnthropic, type MockAnthropic } from "./server";

// The e2e suite's stand-in for the Anthropic API (#70), driven here by the
// real SDK and the production translateText, so the mock speaks the same
// streaming protocol the job does.
describe("mock Anthropic server", () => {
  let mock: MockAnthropic;
  let client: Anthropic;

  beforeAll(async () => {
    mock = await startMockAnthropic(0);
    client = new Anthropic({ baseURL: mock.url, apiKey: "dummy", maxRetries: 0 });
  });

  afterAll(() => mock.close());

  it("answers with the source text tagged by the target Locale", async () => {
    expect(await translateText(client, { text: "Hello agents.", from: "en", to: "de" })).toEqual({
      ok: true,
      text: "[de] Hello agents.",
    });
    expect(await translateText(client, { text: "# Readme\n\n- one", from: "en", to: "zh-CN" })).toEqual({
      ok: true,
      text: "[zh-CN] # Readme\n\n- one",
    });
  });

  it("fails requests whose text contains a failing marker until the marker is cleared", async () => {
    const fail = (method: string) =>
      fetch(`${mock.url}/__mock/fail`, { method, body: JSON.stringify({ marker: "boom-1" }) });

    await fail("POST");
    expect(await translateText(client, { text: "boom-1 text", from: "en", to: "de" })).toEqual({
      ok: false,
      reason: "api_error",
    });
    expect(await translateText(client, { text: "other text", from: "en", to: "de" })).toMatchObject({ ok: true });

    await fail("DELETE");
    expect(await translateText(client, { text: "boom-1 text", from: "en", to: "de" })).toEqual({
      ok: true,
      text: "[de] boom-1 text",
    });
  });

  it("answers a health check", async () => {
    expect((await fetch(`${mock.url}/health`)).status).toBe(200);
  });
});
