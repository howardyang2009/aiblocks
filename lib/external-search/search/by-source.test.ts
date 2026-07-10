import { describe, expect, it } from 'vitest';
import { selectExternalResults } from './by-source';
import type { SearchResponse } from './orchestrator';
import type { SearchResult } from '../adapters/types';

const r = (over: Partial<SearchResult>): SearchResult => ({
  title: 't', url: 'https://x', source: 'github', ...over,
});

function response(over: Partial<SearchResponse> = {}): SearchResponse {
  return {
    results: [],
    sources: [],
    ...over,
  };
}

describe('selectExternalResults', () => {
  it('returns all results unfiltered when there is no active source', () => {
    const external = response({ results: [r({ source: 'github' }), r({ source: 'google' })] });

    const { results } = selectExternalResults(external, undefined);

    expect(results).toHaveLength(2);
  });

  it('filters to results matching the active source', () => {
    const external = response({ results: [r({ source: 'github' }), r({ source: 'google' })] });

    const { results } = selectExternalResults(external, 'github');

    expect(results).toEqual([r({ source: 'github' })]);
  });

  it('matches on the sources[] fallback list, for a result merged from multiple adapters', () => {
    const merged = r({ source: 'github', sources: ['github', 'google'] });
    const external = response({ results: [merged] });

    const { results } = selectExternalResults(external, 'google');

    expect(results).toEqual([merged]);
  });

  it('returns only sources that are ok and have at least one result', () => {
    const external = response({
      sources: [
        { source: 'github', status: 'ok', count: 3 },
        { source: 'google', status: 'ok', count: 0 },
        { source: 'brave', status: 'disabled', count: 0 },
        { source: 'huggingface', status: 'error', count: 0, message: 'boom' },
      ],
    });

    const { availableSources } = selectExternalResults(external, undefined);

    expect(availableSources).toEqual([{ source: 'github', status: 'ok', count: 3 }]);
  });
});
