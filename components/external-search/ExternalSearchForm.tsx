"use client";

import { useState } from "react";
import type { ComponentType } from "@/lib/external-search/types";
import { SearchTypeField } from "./SearchTypeField";
import { Spinner } from "@/components/ui/spinner";

// Plain GET form to /search — works with JS disabled. Shared by the home
// page hero (no defaults) and the /search results page (pre-filled from
// the current query params). onSubmit only sets local state for the
// spinner/disabled look — it never calls preventDefault, so the native
// GET navigation still runs (and still works) with JS off.
export function ExternalSearchForm({
  defaultQuery = "",
  selectedType = "skill",
}: {
  defaultQuery?: string;
  selectedType?: ComponentType;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form action="/search" method="get" onSubmit={() => setSubmitting(true)}>
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Describe the skill, subagent, prompt, or MCP server you're looking for…"
        className="w-full rounded-block border bg-surface px-5 py-3.5 text-base focus:outline-none focus:border-accent"
      />
      <div className="mt-4">
        <SearchTypeField selected={selectedType} />
      </div>
      <div className="mt-5 flex justify-center">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-block bg-ink text-paper px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {submitting && <Spinner className="h-4 w-4" />}
          {submitting ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}
