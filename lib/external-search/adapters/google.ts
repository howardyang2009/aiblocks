import { githubUrlOf } from './github-url';
import type { FetchLike, SearchAdapter, SearchResult } from './types';

interface DerivedStructData {
  title?: string;
  link?: string;
  snippets?: { snippet?: string }[];
}

export function createGoogleAdapter(
  deps: { fetchFn?: FetchLike; apiKey?: string; projectId?: string; engineId?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'google',
    supports: () => true,
    isEnabled: () => Boolean(deps.apiKey && deps.projectId && deps.engineId),
    async search(query: string): Promise<SearchResult[]> {
      const url =
        `https://discoveryengine.googleapis.com/v1/projects/${deps.projectId}/locations/global/` +
        `collections/default_collection/engines/${deps.engineId}/servingConfigs/default_search:searchLite` +
        `?key=${deps.apiKey}`;
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        let detail = '';
        try {
          const errBody = (await res.json()) as { error?: { message?: string } };
          detail = errBody.error?.message ?? '';
        } catch {
          // response body wasn't JSON (or empty) — fall back to status only
        }
        throw new Error(`Google search failed: ${res.status}${detail ? ` — ${detail}` : ''}`);
      }
      const body = (await res.json()) as {
        results?: { document?: { derivedStructData?: DerivedStructData } }[];
      };
      return (body.results ?? [])
        .map((result) => result.document?.derivedStructData)
        .filter((data): data is DerivedStructData & { title: string; link: string } =>
          Boolean(data?.title && data?.link),
        )
        .map((data) => ({
          title: data.title,
          url: data.link,
          githubUrl: githubUrlOf(data.link),
          description: data.snippets?.[0]?.snippet,
          source: 'google' as const,
        }));
    },
  };
}
