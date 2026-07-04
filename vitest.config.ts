import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // "server-only" (imported by lib/supabase/server.ts) picks its
      // no-op branch only under the "react-server" export condition, which
      // Next's bundler sets and a plain Node test runner doesn't — so alias
      // it straight to that no-op file instead of setting the condition
      // globally (which also changes how "react" itself resolves).
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
});
