import type { SearchResult } from "@/lib/external-search/types";
import { ExternalResultCard } from "./ExternalResultCard";

export function ExternalResultsList({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-muted">No results from external sources.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((result) => (
        <ExternalResultCard key={`${result.source}:${result.url}`} result={result} />
      ))}
    </div>
  );
}
