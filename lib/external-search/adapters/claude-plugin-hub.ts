import { githubUrlOf } from './github-url';
import type { ComponentType, FetchLike, SearchAdapter, SearchResult } from './types';

interface ClaudePluginHubPlugin {
  slug: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  repositoryUrl?: string;
  starCount?: number;
}

interface ClaudePluginHubSearchData {
  slug?: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  ownerLogin?: string;
  repoName?: string;
  stars?: number;
  totalStars?: number;
  representativePlugin?: { slug: string };
}

interface ClaudePluginHubSearchResult {
  type: string;
  data: ClaudePluginHubSearchData;
}

const SEARCH_TYPE: Partial<Record<ComponentType, string>> = {
  skill: 'skill',
  subagent: 'agent',
  'slash-command': 'command',
  hook: 'hook',
  mcp: 'mcp',
};

function hubUrl(slug: string): string {
  return `https://www.claudepluginhub.com/plugins/${slug}`;
}

function urlOf(data: ClaudePluginHubSearchData): string {
  if (data.ownerLogin && data.repoName) return `https://github.com/${data.ownerLogin}/${data.repoName}`;
  if (data.representativePlugin) return hubUrl(data.representativePlugin.slug);
  if (data.slug) return hubUrl(data.slug);
  return 'https://www.claudepluginhub.com';
}

export function createClaudePluginHubAdapter(
  deps: { fetchFn?: FetchLike } = {},
): SearchAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    id: 'claude-plugin-hub',
    supports: (type: ComponentType) => type === 'claude-plugin' || Boolean(SEARCH_TYPE[type]),
    isEnabled: () => true,
    async search(query: string, type: ComponentType): Promise<SearchResult[]> {
      if (type === 'claude-plugin') {
        const res = await fetchFn(
          `https://www.claudepluginhub.com/api/plugins?limit=10`,
          { headers: { Accept: 'application/json' } },
        );
        if (!res.ok) throw new Error(`claudepluginhub.com search failed: ${res.status}`);
        const body = (await res.json()) as { items?: ClaudePluginHubPlugin[] };
        return (body.items ?? [])
          .filter((item): item is ClaudePluginHubPlugin & { name: string } => Boolean(item?.name))
          .map((item) => {
            const url = item.repositoryUrl ?? hubUrl(item.slug);
            return {
              title: item.displayName || item.name,
              url,
              githubUrl: githubUrlOf(url),
              description: item.description ?? undefined,
              source: 'claude-plugin-hub' as const,
              stars: item.starCount,
            };
          });
      }

      const searchType = SEARCH_TYPE[type];
      if (!searchType) return [];

      const q = encodeURIComponent(query);
      const res = await fetchFn(
        `https://www.claudepluginhub.com/api/search?q=${q}&limit=10`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`claudepluginhub.com search failed: ${res.status}`);
      const body = (await res.json()) as { results?: ClaudePluginHubSearchResult[] };
      return (body.results ?? [])
        .filter((result) => result.type === searchType && Boolean(result.data?.name))
        .map((result) => {
          const { data } = result;
          const url = urlOf(data);
          return {
            title: data.displayName || data.name,
            url,
            githubUrl: githubUrlOf(url),
            description: data.description ?? undefined,
            source: 'claude-plugin-hub' as const,
            stars: data.stars ?? data.totalStars,
          };
        });
    },
  };
}
