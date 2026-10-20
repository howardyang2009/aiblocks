import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Deliberately NOT .env.local — e2e must never touch real dev credentials.
loadEnv({ path: path.resolve(__dirname, ".env.test.local") });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL ?? "http://127.0.0.1:4010";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    // Pin the browser language so nothing depends on the host machine. The
    // main suite still always visits explicit /en/... URLs and never relies
    // on the unprefixed doorway redirect (#64).
    locale: "en-US",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev:test",
      url: BASE_URL,
      // Never attach to an already-running server: that could silently be the
      // real dev server with real credentials instead of the test env. If the
      // port is taken, Playwright will fail loudly instead of testing the
      // wrong thing.
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // The translation job's Claude calls land here, never on the real API
      // (#64, #70): the dev server reads ANTHROPIC_BASE_URL from .env.test.local.
      command: "npx tsx e2e/mock-anthropic/main.ts",
      url: `${ANTHROPIC_BASE_URL}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      // Signed-out specs (browse, locale-smoke, locale-switcher, seo) — independent
      // of the auth harness entirely, so a Clerk outage doesn't block them.
      name: "signed-out",
      testMatch: /(browse|locale-smoke|locale-switcher|seo|translated-content)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Signed-in specs — depend on "setup" so the saved session exists.
      name: "signed-in",
      testMatch: /(publish-and-engage|translation-job)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
