import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
}

export function createGithubAdapter(
  deps: { fetchFn?: FetchLike; token?: string } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'github',
    supports: () => true,
    isEnabled: () => true,
    async search(query: string, type: ComponentType): Promise<SearchResult[]> {
      const q = encodeURIComponent(`ai ${type} for ${query}`);
      const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
      if (deps.token) headers.Authorization = `Bearer ${deps.token}`;
      const res = await fetchFn(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=10`,
        { headers },
      );
      if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`);
      const body = (await res.json()) as { items?: GithubRepo[] };
      return (body.items ?? []).map((item) => ({
        title: item.full_name,
        url: item.html_url,
        githubUrl: item.html_url,
        description: item.description ?? undefined,
        source: 'github' as const,
        stars: item.stargazers_count,
      }));
    },
  };
}
