"use client";

// Clickable tag filters for the Browse page. Wire selected tags into the
// query string and re-fetch. Free-form tags come from /api/tags.
export function TagFilter({
  tags,
  selected = [],
  onToggle,
}: {
  tags: string[];
  selected?: string[];
  onToggle?: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle?.(tag)}
            className={`font-mono text-xs rounded-[3px] border px-2 py-1 transition-colors ${
              active ? "bg-ink text-paper border-ink" : "text-muted hover:border-accent"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
