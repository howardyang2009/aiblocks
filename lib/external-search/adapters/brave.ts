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
      const res = await fetchFn(
        `https://api.search.brave.com/res/v1/web/search?q=${q}&count=10`,
        {
          headers: {
            Accept: 'application/json',
            'X-Subscription-Token': deps.apiKey ?? '',
          },
        },
      );
      if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);
      const body = (await res.json()) as { web?: { results?: BraveWebResult[] } };
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
