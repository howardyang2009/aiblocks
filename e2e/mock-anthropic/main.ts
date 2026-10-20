import { startMockAnthropic } from "./server";

// Started by playwright.config.ts next to the dev server, on the port
// ANTHROPIC_BASE_URL in .env.test.local points at.
const port = Number(new URL(process.env.ANTHROPIC_BASE_URL ?? "http://127.0.0.1:4010").port);
startMockAnthropic(port).then(({ url }) => console.log(`mock Anthropic listening on ${url}`));
