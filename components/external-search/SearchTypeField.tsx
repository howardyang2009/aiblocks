import type { ComponentType } from "@/lib/external-search/types";

const TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: "skill", label: "Skill" },
  { value: "subagent", label: "Subagent" },
  { value: "prompt", label: "Prompt" },
  { value: "mcp", label: "MCP server" },
  { value: "hook", label: "Hook" },
  { value: "slash-command", label: "Slash command" },
  { value: "claude-plugin", label: "Claude plugin" },
  { value: "claude-md", label: "CLAUDE.md" },
  { value: "model", label: "Model" },
];

// A real HTML radio group styled as pills — no client JS. Each hidden
// radio drives its sibling label via Tailwind's peer-checked variant, so
// the selected type travels with a plain GET form submit.
export function SearchTypeField({ selected }: { selected: ComponentType }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Component type">
      {TYPE_OPTIONS.map((opt) => (
        <div key={opt.value}>
          <input
            type="radio"
            name="type"
            value={opt.value}
            id={`type-${opt.value}`}
            defaultChecked={opt.value === selected}
            className="peer sr-only"
          />
          <label
            htmlFor={`type-${opt.value}`}
            className="cursor-pointer select-none rounded-block border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper"
          >
            {opt.label}
          </label>
        </div>
      ))}
    </div>
  );
}
