import type { ComponentType } from "@/lib/external-search/types";
import { SearchTypeField } from "./SearchTypeField";

// Plain GET form to /search — works with JS disabled. Shared by the home
// page hero (no defaults) and the /search results page (pre-filled from
// the current query params).
export function ExternalSearchForm({
  defaultQuery = "",
  selectedType = "skill",
}: {
  defaultQuery?: string;
  selectedType?: ComponentType;
}) {
  return (
    <form action="/search" method="get">
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Describe the skill, agent, prompt, or MCP server you're looking for…"
        className="w-full rounded-block border bg-surface px-5 py-3.5 text-base focus:outline-none focus:border-accent"
      />
      <div className="mt-4">
        <SearchTypeField selected={selectedType} />
      </div>
      <div className="mt-5 flex justify-center">
        <button
          type="submit"
          className="rounded-block bg-ink text-paper px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
