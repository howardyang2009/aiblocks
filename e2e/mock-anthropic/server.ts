import http from "node:http";
import type { AddressInfo } from "node:net";

// A local stand-in for the Anthropic Messages API, for the e2e suite (#70).
// The dev server reaches it through ANTHROPIC_BASE_URL, which the SDK reads
// natively, so production code has no test seam. It "translates" by tagging
// the source text with the target Locale: `[de] <source>`.
//
// Specs make it fail on purpose with POST /__mock/fail {"marker": "..."}:
// every request whose text contains that marker gets a non-retryable 400
// until DELETE /__mock/fail with the same marker. Markers keep parallel
// specs from affecting each other.

const LOCALES: Record<string, string> = { German: "de", English: "en", "Simplified Chinese": "zh-CN" };

// Matches the user turn lib/translation/claude.ts sends.
const REQUEST = /into (German|English|Simplified Chinese)\.\n\n<(source_text_[0-9a-f]+)>\n([\s\S]*)\n<\/\2>$/;

export type MockAnthropic = { url: string; close(): Promise<void> };

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sse(res: http.ServerResponse, model: string, text: string) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  const send = (data: { type: string; [key: string]: unknown }) => res.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
  send({
    type: "message_start",
    message: {
      id: "msg_mock",
      type: "message",
      role: "assistant",
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 0 },
    },
  });
  send({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  send({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
  send({ type: "content_block_stop", index: 0 });
  send({ type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } });
  send({ type: "message_stop" });
  res.end();
}

function error(res: http.ServerResponse, status: number, message: string) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }));
}

export function startMockAnthropic(port: number): Promise<MockAnthropic> {
  const failing = new Set<string>();

  const server = http.createServer(async (req, res) => {
    const body = await readBody(req);

    if (req.url === "/health") return res.end("ok");

    if (req.url === "/__mock/fail") {
      const { marker } = JSON.parse(body) as { marker: string };
      if (req.method === "POST") failing.add(marker);
      else failing.delete(marker);
      return res.end("ok");
    }

    if (req.method !== "POST" || req.url !== "/v1/messages") return error(res, 404, "not found");

    const params = JSON.parse(body) as { model: string; messages: { content: string }[] };
    const match = REQUEST.exec(params.messages[0]?.content ?? "");
    if (!match) return error(res, 400, "mock: unexpected request");
    const [, language, , text] = match;
    if ([...failing].some((marker) => text.includes(marker))) return error(res, 400, "mock: told to fail");
    sse(res, params.model, `[${LOCALES[language]}] ${text}`);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const { port: actual } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${actual}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}
