import type { SearchResponse, SourceStatus } from './orchestrator';
import type { AdapterId, SearchResult } from '../adapters/types';

// What the search page's "From around the web" section needs to render:
// the results for the currently-selected source tab (or all of them), and
// which source tabs are worth showing at all. A result that came back from
// more than one adapter carries `sources` (the full list); one that came
// from just one only carries `source` — `sources ?? [source]` normalizes
// that before matching the active tab.
export function selectExternalResults(
  external: SearchResponse,
  activeSource: string | undefined
): { results: SearchResult[]; availableSources: SourceStatus[] } {
  const results = activeSource
    ? external.results.filter((r) => (r.sources ?? [r.source]).includes(activeSource as AdapterId))
    : external.results;

  const availableSources = external.sources.filter((s) => s.status === 'ok' && s.count > 0);

  return { results, availableSources };
}
