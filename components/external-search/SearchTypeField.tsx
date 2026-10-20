import { useTranslations } from "next-intl";
import type { ComponentType } from "@/lib/external-search/types";

// Display order of the type pills; labels come from ExternalSearch.types.
const TYPE_OPTIONS: ComponentType[] = [
  "skill",
  "subagent",
  "prompt",
  "mcp",
  "hook",
  "slash-command",
  "claude-plugin",
  "claude-md",
  "llm",
];

// A real HTML radio group styled as pills — no client JS. Each hidden
// radio drives its sibling label via Tailwind's peer-checked variant, so
// the selected type travels with a plain GET form submit.
export function SearchTypeField({ selected }: { selected: ComponentType }) {
  const t = useTranslations("ExternalSearch");
  return (
    <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label={t("typeLabel")}>
      {TYPE_OPTIONS.map((value) => (
        <div key={value}>
          <input
            type="radio"
            name="type"
            value={value}
            id={`type-${value}`}
            defaultChecked={value === selected}
            className="peer sr-only"
          />
          <label
            htmlFor={`type-${value}`}
            className="cursor-pointer select-none rounded-block border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink"
          >
            {t(`types.${value}`)}
          </label>
        </div>
      ))}
    </div>
  );
}
