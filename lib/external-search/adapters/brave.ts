import { fetchJson } from './fetch-json';
import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

export function createBraveAdapter(
  deps: { fetchFn?: FetchLike; apiKey?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'brave',
    supports: () => true,
    isEnabled: () => Boolean(deps.apiKey),
    async search(query: string, type: ComponentType): Promise<SearchResult[]> {
      const q = encodeURIComponent(`ai ${type} for ${query}`);
      const body = await fetchJson<{ web?: { results?: BraveWebResult[] } }>(
        fetchFn,
        `https://api.search.brave.com/res/v1/web/search?q=${q}&count=10`,
        { Accept: 'application/json', 'X-Subscription-Token': deps.apiKey ?? '' },
        'Brave'
      );
      return (body.web?.results ?? [])
        .filter((result): result is BraveWebResult & { title: string; url: string } =>
          Boolean(result?.title && result?.url),
        )
        .map((result) => ({
          title: result.title,
          url: result.url,
          githubUrl: githubUrlOf(result.url),
          description: result.description,
          source: 'brave' as const,
        }));
    },
  };
}
