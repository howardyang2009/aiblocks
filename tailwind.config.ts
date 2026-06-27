import type { Config } from "tailwindcss";

// Design tokens are defined as CSS variables in app/globals.css and
// surfaced here so utility classes (bg-paper, text-accent, font-display...)
// stay in sync with a single source of truth.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        free: "var(--free)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        block: "4px",
      },
      maxWidth: {
        shell: "1180px",
      },
    },
  },
  plugins: [],
};
export default config;
