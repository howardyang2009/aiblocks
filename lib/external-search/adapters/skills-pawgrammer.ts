import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface PawgrammerSkill {
  title: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  author?: string;
  repoUrl: string;
}

function matches(item: PawgrammerSkill, terms: string[]): boolean {
  const haystack = [item.title, item.description, item.author, ...(item.tags ?? []), ...(item.categories ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function createSkillsPawgrammerAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'skills-pawgrammer',
    supports: (type: ComponentType) => type === 'skill',
    isEnabled: () => true,
    async search(query: string): Promise<SearchResult[]> {
      // The endpoint returns the entire catalog regardless of query params —
      // it's a static search index meant for client-side matching.
      const res = await fetchFn('https://skills.pawgrammer.com/api/search-index', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`skills.pawgrammer.com search failed: ${res.status}`);
      const body = (await res.json()) as unknown;
      if (!Array.isArray(body)) return [];

      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      return (body as PawgrammerSkill[])
        .filter((item): item is PawgrammerSkill => Boolean(item?.title && item?.repoUrl))
        .filter((item) => matches(item, terms))
        .slice(0, 10)
        .map((item) => ({
          title: item.title,
          url: item.repoUrl,
          githubUrl: githubUrlOf(item.repoUrl),
          description: item.description,
          source: 'skills-pawgrammer' as const,
        }));
    },
  };
}
